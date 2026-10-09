import { Injectable } from '@nestjs/common';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { ShopifyCredentialsService } from '../core/shopify-credentials.service';
import { ShopifyGraphqlService } from '../core/shopify-graphql.service';
import {
  AgregarImagenDto,
  EliminarImagenDto,
  ReordenarImagenesDto,
} from './dto/productos.dto';
import {
  CONSULTA_MEDIA_PRODUCTO,
  MUTACION_AGREGAR_IMAGEN,
  MUTACION_ELIMINAR_IMAGEN,
  MUTACION_REORDENAR_IMAGENES,
} from './productos.graphql';
import {
  estadoImagenNormalizado,
  leerLista,
  leerObjeto,
  texto,
} from './productos.mapper';
import type { MedioProducto, ResultadoEscritura } from './productos.types';

/**
 * Shopify descarga la imagen que se le pasa y la procesa por su cuenta. El GID
 * existe al instante, pero la foto puede tardar segundos en estar `READY`, así
 * que se sondea en vez de refrescar el caché con un alta a medias.
 */
const ESPERA_MEDIA_MS = 700;
const ESPERA_MEDIA_INTENTOS = 12;

/**
 * `productReorderMedia` devuelve un job asíncrono. En vez de confiarle la
 * palabra, se relee el orden real del media hasta que coincida con el pedido.
 */
const ESPERA_ORDEN_MS = 600;
const ESPERA_ORDEN_INTENTOS = 8;

/**
 * `Product.images` es la conexión legacy y devuelve GIDs `ProductImage`, que ni
 * `fileDelete` ni `productReorderMedia` aceptan (y cuyos números no coinciden
 * con los canónicos). El GID de un archivo tiene que ser de esta lista.
 */
const TIPOS_ARCHIVO_ACEPTADOS = [
  'MediaImage',
  'MediaVideo',
  'File',
  'GenericFile',
  'Image',
] as const;

/**
 * Galería del producto: subida vía Cloudinary + `productUpdate`, reordenamiento
 * con posiciones absolutas del media completo y borrado con confirmación
 * previa en el panel. Cada operación se queda solo con su parte de la caché:
 * el refresco lo dispara el servicio que orquesta.
 */
@Injectable()
export class ShopifyProductosImagenesService {
  constructor(
    private readonly graphql: ShopifyGraphqlService,
    private readonly credenciales: ShopifyCredentialsService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  /**
   * Shopify no acepta archivos en `productUpdate` en esta versión: hay que
   * subir la imagen a Cloudinary y pasarle la URL, que Shopify descarga desde
   * ahí. `media` va en el argumento hermano de `product`, no dentro de
   * `ProductUpdateInput`.
   */
  async agregarImagen(
    id: string,
    dto: AgregarImagenDto,
  ): Promise<ResultadoEscritura> {
    // Foto del media actual: sirve para reconocer la imagen nueva al sondear.
    const previos = (await this.leerMedios(id))?.map((m) => m.id) ?? null;
    const subida = await this.cloudinary.subirImagenProducto(dto.data_url);

    const resultado = await this.credenciales.conReintento((datos) =>
      this.graphql.ejecutar<{
        productUpdate: { userErrors: { field: string[]; message: string }[] };
      }>(
        datos.token,
        datos.shop,
        MUTACION_AGREGAR_IMAGEN,
        {
          product: { id },
          media: [
            {
              originalSource: subida.url_imagen,
              mediaContentType: 'IMAGE',
              ...(dto.alt ? { alt: dto.alt } : {}),
            },
          ],
        },
        `agregar imagen a ${id}`,
      ),
    );

    if (!resultado.ok) {
      // Shopify no llegó a usarla: la copia de Cloudinary queda huérfana.
      await this.cloudinary.eliminarImagenProducto(subida.public_id);
      return { ok: false, mensaje: resultado.mensaje };
    }

    const errores = resultado.datos?.productUpdate?.userErrors ?? [];
    if (errores.length > 0) {
      await this.cloudinary.eliminarImagenProducto(subida.public_id);
      return { ok: false, mensaje: errores.map((e) => e.message).join(' | ') };
    }

    const espera = previos
      ? await this.esperarImagenNueva(id, new Set(previos))
      : 'procesando';
    if (espera === 'fallida') {
      await this.cloudinary.eliminarImagenProducto(subida.public_id);
      return {
        ok: false,
        mensaje: 'Shopify recibió la imagen pero no pudo procesarla.',
      };
    }

    return {
      ok: true,
      mensaje:
        espera === 'procesando'
          ? 'Imagen agregada. Shopify todavía la está procesando; aparecerá en unos segundos.'
          : 'Imagen agregada al producto.',
    };
  }

  /**
   * Espera a que aparezca el media nuevo y esté `READY`. No se confía en el
   * alta: si el procesamiento falla, la copia de Cloudinary sobra y se avisa.
   */
  private async esperarImagenNueva(
    id: string,
    previos: Set<string>,
  ): Promise<'lista' | 'procesando' | 'fallida'> {
    for (let intento = 0; intento < ESPERA_MEDIA_INTENTOS; intento++) {
      await this.dormir(ESPERA_MEDIA_MS);
      const medios = await this.leerMedios(id);
      const nuevo = medios?.find((m) => !previos.has(m.id));
      if (!nuevo) continue;
      if (nuevo.estado === 'FAILED') return 'fallida';
      if (nuevo.estado === 'READY' || nuevo.estado === null) return 'lista';
    }
    return 'procesando';
  }

  /** Media del producto con su GID canónico y su estado, o `null` si falló. */
  async leerMedios(id: string): Promise<MedioProducto[] | null> {
    const resultado = await this.credenciales.conReintento((datos) =>
      this.graphql.ejecutar<{
        product: { media: { nodes: unknown[] } } | null;
      }>(
        datos.token,
        datos.shop,
        CONSULTA_MEDIA_PRODUCTO,
        { id },
        `media de ${id}`,
      ),
    );

    if (!resultado.ok || !resultado.datos?.product) return null;

    const medios: MedioProducto[] = [];
    for (const nodo of leerLista(resultado.datos.product.media, 'nodes')) {
      const n = leerObjeto(nodo);
      const idMedio = texto(n?.['id']);
      if (!idMedio) continue;
      medios.push({
        id: idMedio,
        es_imagen: texto(n?.['mediaContentType']) === 'IMAGE',
        estado: estadoImagenNormalizado(texto(n?.['status'])),
      });
    }
    return medios;
  }

  private dormir(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * La portada de Shopify es la imagen en posición 0, así que ponerla primera
   * la convierte en portada.
   *
   * El frontend manda el orden de las imágenes, pero `productReorderMedia`
   * reordena el media completo con posiciones absolutas. Si el producto tuviera
   * un video, el índice de la galería no sería la posición real, así que acá se
   * traduce el pedido al media del producto y se manda solo lo que cambia.
   */
  async reordenarImagenes(
    id: string,
    dto: ReordenarImagenesDto,
  ): Promise<ResultadoEscritura> {
    if (dto.ids.length === 0) {
      return { ok: false, mensaje: 'No se indicó ninguna imagen.' };
    }

    const medios = await this.leerMedios(id);
    if (!medios) {
      return {
        ok: false,
        mensaje: 'No se pudo leer el media del producto en Shopify.',
      };
    }

    const actuales = medios.map((m) => m.id);
    const imagenes = medios.filter((m) => m.es_imagen).map((m) => m.id);
    const otros = medios.filter((m) => !m.es_imagen).map((m) => m.id);

    // Se ignoran ids que ya no estén en el producto y se completan con las que
    // falten: mandar una lista con huecos dejaría el media inconsistente.
    // Los medios que no son imagen quedan al final, en su orden actual.
    const pedidas = dto.ids.filter((idImagen) => imagenes.includes(idImagen));
    const faltantes = imagenes.filter(
      (idImagen) => !pedidas.includes(idImagen),
    );
    const objetivo = [...pedidas, ...faltantes, ...otros];

    const moves = objetivo
      // `newPosition` es `UnsignedInt64`: Shopify lo quiere como string. Mandarlo
      // como número hace que el documento se rechace entero.
      .map((idMedio, posicion) => ({
        id: idMedio,
        newPosition: String(posicion),
      }))
      .filter((move) => actuales.indexOf(move.id) !== Number(move.newPosition));

    if (moves.length === 0) {
      return { ok: false, mensaje: 'El orden ya era ese.' };
    }

    const resultado = await this.credenciales.conReintento((datos) =>
      this.graphql.ejecutar<{
        productReorderMedia: {
          job: { id: string } | null;
          mediaUserErrors: { field: string[]; message: string }[];
        };
      }>(
        datos.token,
        datos.shop,
        MUTACION_REORDENAR_IMAGENES,
        { id, moves },
        `reordenar imágenes de ${id}`,
      ),
    );

    if (!resultado.ok) return { ok: false, mensaje: resultado.mensaje };

    const errores = resultado.datos?.productReorderMedia?.mediaUserErrors ?? [];
    if (errores.length > 0) {
      return { ok: false, mensaje: errores.map((e) => e.message).join(' | ') };
    }

    // El job es asíncrono: el GET que hace el frontend después puede leer el
    // orden viejo. Se relee hasta que el media coincida con lo pedido.
    const aplicado = await this.esperarOrden(id, objetivo);

    return {
      ok: true,
      mensaje: aplicado
        ? 'Orden de imágenes actualizado.'
        : 'Orden enviado a Shopify; puede tardar unos segundos en aplicarse.',
    };
  }

  /** Sondea el media del producto hasta que su orden sea el pedido. */
  private async esperarOrden(id: string, objetivo: string[]): Promise<boolean> {
    for (let intento = 0; intento < ESPERA_ORDEN_INTENTOS; intento++) {
      const medios = await this.leerMedios(id);
      if (medios?.map((m) => m.id).join(',') === objetivo.join(',')) {
        return true;
      }
      await this.dormir(ESPERA_ORDEN_MS);
    }
    return false;
  }

  /**
   * El GID tiene que ser de un tipo de archivo real. El `ProductImage` de la
   * conexión legacy no sirve y no se puede "arreglar" cambiando el prefijo: sus
   * números son otros, no los del `MediaImage` correspondiente.
   */
  private idArchivo(id: string): string | null {
    const partes = /^gid:\/\/shopify\/([A-Za-z]+)\/(\d+)$/.exec(id.trim());
    if (!partes) return null;
    const tipo = partes[1] as (typeof TIPOS_ARCHIVO_ACEPTADOS)[number];
    if (!TIPOS_ARCHIVO_ACEPTADOS.includes(tipo)) return null;
    return `gid://shopify/${tipo}/${partes[2]}`;
  }

  /**
   * Borrar una imagen es irreversible en Shopify y no se puede recuperar desde
   * acá, así que el frontend pide confirmación.
   */
  async eliminarImagen(
    id: string,
    dto: EliminarImagenDto,
  ): Promise<ResultadoEscritura> {
    const idMedio = this.idArchivo(dto.id);
    if (!idMedio) {
      return {
        ok: false,
        mensaje: dto.id.includes('ProductImage')
          ? 'El identificador de la imagen está desactualizado. Volvé a abrir el producto e intentá de nuevo.'
          : 'El identificador de la imagen no es válido.',
      };
    }

    const resultado = await this.credenciales.conReintento((datos) =>
      this.graphql.ejecutar<{
        productDeleteMedia: {
          deletedMediaIds: string[] | null;
          mediaUserErrors: { field: string[]; message: string }[];
        };
      }>(
        datos.token,
        datos.shop,
        MUTACION_ELIMINAR_IMAGEN,
        { productId: id, mediaIds: [idMedio] },
        `eliminar imagen de ${id}`,
      ),
    );

    if (!resultado.ok) return { ok: false, mensaje: resultado.mensaje };

    const errores = resultado.datos?.productDeleteMedia?.mediaUserErrors ?? [];
    if (errores.length > 0) {
      return { ok: false, mensaje: errores.map((e) => e.message).join(' | ') };
    }

    const borradas = resultado.datos?.productDeleteMedia?.deletedMediaIds ?? [];
    if (!borradas.includes(idMedio)) {
      return {
        ok: false,
        mensaje: 'La imagen no existe o ya fue borrada de Shopify.',
      };
    }

    return { ok: true, mensaje: 'Imagen eliminada de Shopify.' };
  }
}
