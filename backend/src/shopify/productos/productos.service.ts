import { Injectable } from '@nestjs/common';
import { ShopifyCredentialsService } from '../core/shopify-credentials.service';
import { ShopifyGraphqlService } from '../core/shopify-graphql.service';
import { ShopifyProductosCatalogoService } from './productos.catalogo.service';
import { ShopifyProductosImagenesService } from './productos.imagenes.service';
import {
  ActualizarGarantiaDto,
  ActualizarProductoDto,
  ActualizarVariantesDto,
  AgregarImagenDto,
  EliminarImagenDto,
  ListarProductosDto,
  ReordenarImagenesDto,
} from './dto/productos.dto';
import {
  MUTACION_ACTUALIZAR_PRODUCTO,
  MUTACION_ACTUALIZAR_VARIANTES,
  MUTACION_ELIMINAR_PRODUCTO,
  MUTACION_GUARDAR_GARANTIA,
} from './productos.graphql';
import type {
  ProductoShopify,
  ProductosRespuesta,
  ResultadoEscritura,
  ResultadoProducto,
} from './productos.types';

/**
 * La garantía es un metafield `multi_line_text_field`: bloques separados por una
 * línea en blanco, con el motivo en la primera línea y el detalle en las
 * siguientes. Es el mismo formato que usa el parser del panel.
 */
const METAFIELD_GARANTIA = {
  namespace: 'custom',
  key: 'informacion_de_garantia',
  type: 'multi_line_text_field',
} as const;

/**
 * Fachada del módulo de productos: expone lo que usa el controller y reparte el
 * trabajo entre el catálogo (lectura/caché), las imágenes (galería) y las
 * escrituras que van directo a `productUpdate` / `metafieldsSet`.
 *
 * Todas las escrituras exitosas refrescan el producto en la caché para que la
 * siguiente visita al listado no muestre datos viejos.
 */
@Injectable()
export class ShopifyProductosService {
  constructor(
    private readonly graphql: ShopifyGraphqlService,
    private readonly credenciales: ShopifyCredentialsService,
    private readonly catalogo: ShopifyProductosCatalogoService,
    private readonly imagenes: ShopifyProductosImagenesService,
  ) {}

  // ------------------------------------------------------------- lectura

  listar(dto: ListarProductosDto): ProductosRespuesta {
    return this.catalogo.listar(dto);
  }

  resumen(): {
    productos: number;
    variantes: number;
    variantes_sin_stock: number;
    unidades: number;
    proveedores: string[];
  } {
    return this.catalogo.resumen();
  }

  obtener(id: string): Promise<ResultadoProducto<ProductoShopify>> {
    return this.catalogo.obtener(id);
  }

  asegurarCatalogo(): Promise<void> {
    return this.catalogo.asegurarCatalogo();
  }

  cacheVigente(): boolean {
    return this.catalogo.cacheVigente();
  }

  invalidarCache(): void {
    this.catalogo.invalidarCache();
  }

  sincronizar(): Promise<{
    ok: boolean;
    mensaje: string;
    productos: number;
  }> {
    return this.catalogo.sincronizar();
  }

  // ------------------------------------------------------------- escritura

  async actualizar(
    id: string,
    dto: ActualizarProductoDto,
  ): Promise<ResultadoEscritura> {
    const entrada: Record<string, unknown> = { id };
    if (dto.titulo !== undefined) entrada['title'] = dto.titulo;
    if (dto.descripcion_html !== undefined)
      entrada['descriptionHtml'] = dto.descripcion_html;
    if (dto.tipo !== undefined) entrada['productType'] = dto.tipo;
    if (dto.tags !== undefined) entrada['tags'] = dto.tags;

    const resultado = await this.credenciales.conReintento((datos) =>
      this.graphql.ejecutar<{
        productUpdate: { userErrors: { field: string[]; message: string }[] };
      }>(
        datos.token,
        datos.shop,
        MUTACION_ACTUALIZAR_PRODUCTO,
        { product: entrada },
        `actualizar producto ${id}`,
      ),
    );

    if (!resultado.ok) {
      return { ok: false, mensaje: resultado.mensaje };
    }
    const errores = resultado.datos?.productUpdate?.userErrors ?? [];
    if (errores.length > 0) {
      return { ok: false, mensaje: errores.map((e) => e.message).join(' | ') };
    }

    this.catalogo.refrescar(id);
    return { ok: true, mensaje: 'Producto actualizado en Shopify.' };
  }

  async actualizarVariantes(
    id: string,
    dto: ActualizarVariantesDto,
  ): Promise<ResultadoEscritura> {
    const paraBulk: Record<string, unknown>[] = [];
    for (const variante of dto.variantes) {
      const entrada: Record<string, unknown> = { id: variante.id_variante };
      // Shopify no acepta `sku: null`; limpiar el SKU se hace con cadena vacía.
      if (variante.precio !== undefined) {
        entrada['price'] = variante.precio.toFixed(2);
      }
      if (Object.keys(entrada).length > 1) paraBulk.push(entrada);
    }

    if (paraBulk.length > 0) {
      const resultado = await this.credenciales.conReintento((datos) =>
        this.graphql.ejecutar<{
          productVariantsBulkUpdate: {
            userErrors: { field: string[]; message: string }[];
          };
        }>(
          datos.token,
          datos.shop,
          MUTACION_ACTUALIZAR_VARIANTES,
          { productId: id, variants: paraBulk },
          `actualizar variantes de ${id}`,
        ),
      );
      if (!resultado.ok) {
        return { ok: false, mensaje: resultado.mensaje };
      }
      const errores =
        resultado.datos?.productVariantsBulkUpdate?.userErrors ?? [];
      if (errores.length > 0) {
        return {
          ok: false,
          mensaje: errores.map((e) => e.message).join(' | '),
        };
      }
    }

    this.catalogo.refrescar(id);
    return { ok: true, mensaje: 'Variantes actualizadas en Shopify.' };
  }

  /**
   * La garantía no es un campo del producto sino un metafield, así que va por
   * `metafieldsSet` y no por `productUpdate`. Se manda el texto tal cual, ya
   * normalizado por el frontend en bloques con línea en blanco.
   */
  async actualizarGarantia(
    id: string,
    dto: ActualizarGarantiaDto,
  ): Promise<ResultadoEscritura> {
    // El panel manda bloques ya separados por línea en blanco; se normalizan los
    // saltos sobrantes para no dejar triples espacios dentro del metafield.
    const valor = dto.garantia
      .split(/\n\s*\n/)
      .map((bloque) => bloque.trim())
      .filter(Boolean)
      .join('\n\n');

    const resultado = await this.credenciales.conReintento((datos) =>
      this.graphql.ejecutar<{
        metafieldsSet: { userErrors: { field: string[]; message: string }[] };
      }>(
        datos.token,
        datos.shop,
        MUTACION_GUARDAR_GARANTIA,
        {
          metafields: [
            {
              ownerId: id,
              namespace: METAFIELD_GARANTIA.namespace,
              key: METAFIELD_GARANTIA.key,
              type: METAFIELD_GARANTIA.type,
              value: valor,
            },
          ],
        },
        `actualizar garantía de ${id}`,
      ),
    );

    if (!resultado.ok) return { ok: false, mensaje: resultado.mensaje };

    const errores = resultado.datos?.metafieldsSet?.userErrors ?? [];
    if (errores.length > 0) {
      return { ok: false, mensaje: errores.map((e) => e.message).join(' | ') };
    }

    this.catalogo.refrescar(id);
    return { ok: true, mensaje: 'Garantía actualizada en Shopify.' };
  }

  async eliminar(id: string): Promise<{ ok: boolean; mensaje: string }> {
    const resultado = await this.credenciales.conReintento((datos) =>
      this.graphql.ejecutar<{
        productDelete: {
          deletedProductId: string | null;
          userErrors: { message: string }[];
        };
      }>(
        datos.token,
        datos.shop,
        MUTACION_ELIMINAR_PRODUCTO,
        { input: { id } },
        `eliminar producto ${id}`,
      ),
    );

    if (!resultado.ok) return { ok: false, mensaje: resultado.mensaje };

    const errores = resultado.datos?.productDelete?.userErrors ?? [];
    if (errores.length > 0) {
      return { ok: false, mensaje: errores.map((e) => e.message).join(' | ') };
    }
    this.catalogo.registrarBorrado(id);
    this.catalogo.invalidarCache();
    return { ok: true, mensaje: 'Producto eliminado de Shopify.' };
  }

  // ------------------------------------------------------------- galería

  async agregarImagen(
    id: string,
    dto: AgregarImagenDto,
  ): Promise<ResultadoEscritura> {
    const resultado = await this.imagenes.agregarImagen(id, dto);
    if (resultado.ok) this.catalogo.refrescar(id);
    return resultado;
  }

  async reordenarImagenes(
    id: string,
    dto: ReordenarImagenesDto,
  ): Promise<ResultadoEscritura> {
    const resultado = await this.imagenes.reordenarImagenes(id, dto);
    if (resultado.ok) this.catalogo.refrescar(id);
    return resultado;
  }

  async eliminarImagen(
    id: string,
    dto: EliminarImagenDto,
  ): Promise<ResultadoEscritura> {
    const resultado = await this.imagenes.eliminarImagen(id, dto);
    if (resultado.ok) this.catalogo.refrescar(id);
    return resultado;
  }
}
