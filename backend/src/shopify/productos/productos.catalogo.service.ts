import { Injectable, Logger } from '@nestjs/common';
import { ShopifyCredentialsService } from '../core/shopify-credentials.service';
import { ShopifyGraphqlService } from '../core/shopify-graphql.service';
import {
  DireccionOrden,
  ListarProductosDto,
  OrdenProductos,
} from './dto/productos.dto';
import { CONSULTA_CATALOGO, CONSULTA_PRODUCTO } from './productos.graphql';
import { mapearProducto } from './productos.mapper';
import type {
  ProductoShopify,
  ProductosRespuesta,
  ResultadoProducto,
} from './productos.types';

const TTL_CACHE_MS = 60 * 1000;
const PRODUCTOS_POR_PAGINA = 50;
const MAX_PAGINAS_CATALOGO = 20;

/**
 * Shopify borra de verdad pero su lectura es eventual: durante unos segundos
 * el producto borrado sigue apareciendo. Se filtran los ids recién borrados
 * para que no "resucite" en la vista si el usuario sincroniza enseguida.
 */
const VIGENCIA_BORRADO_MS = 60 * 1000;

/**
 * Catálogo en memoria: página de listado, resumen de KPIs y la lectura desde
 * Shopify con su TTL. Vive separado del servicio de productos para que las
 * escrituras no arrastren el estado de la caché con ellas.
 */
@Injectable()
export class ShopifyProductosCatalogoService {
  private readonly logger = new Logger(ShopifyProductosCatalogoService.name);
  private catalogo: ProductoShopify[] | null = null;
  private cacheadoEn = 0;
  private lecturaEnCurso: Promise<ProductoShopify[]> | null = null;
  /** id de producto -> instante del borrado, para ocultarlo mientras Shopify lo siga devolviendo. */
  private readonly borradosRecientes = new Map<string, number>();
  /** Refrescos del caché agrupados por producto, para no releer de más. */
  private readonly refreshPendiente = new Set<string>();
  private readonly refreshEnCurso = new Set<string>();

  constructor(
    private readonly graphql: ShopifyGraphqlService,
    private readonly credenciales: ShopifyCredentialsService,
  ) {}

  private purgarsBorradosRecientes(): void {
    const limite = Date.now() - VIGENCIA_BORRADO_MS;
    for (const [id, momento] of this.borradosRecientes) {
      if (momento < limite) this.borradosRecientes.delete(id);
    }
  }

  /** Catálogo sin los productos borrados hace poco que Shopify aún lista. */
  private catalogoVisible(): ProductoShopify[] {
    this.purgarsBorradosRecientes();
    if (this.borradosRecientes.size === 0) return this.catalogo ?? [];
    return (this.catalogo ?? []).filter(
      (p) => !this.borradosRecientes.has(p.id_producto),
    );
  }

  listar(dto: ListarProductosDto): ProductosRespuesta {
    const porPagina = dto.por_pagina ?? 25;
    const pagina = dto.pagina ?? 1;

    const todos = this.catalogoVisible();
    const filtrados = this.filtrar(todos, dto);
    const ordenados = this.ordenar(filtrados, dto.orden, dto.direccion);

    const totalPaginas = Math.max(1, Math.ceil(ordenados.length / porPagina));
    const paginaSegura = Math.min(Math.max(1, pagina), totalPaginas);
    const inicio = (paginaSegura - 1) * porPagina;
    const ventana = ordenados.slice(inicio, inicio + porPagina);

    return {
      productos: ventana,
      pagina: paginaSegura,
      por_pagina: porPagina,
      total: ordenados.length,
      total_paginas: totalPaginas,
      total_variantes: todos.reduce((suma, p) => suma + p.variantes.length, 0),
    };
  }

  /** Aplica búsqueda y filtros del panel sobre la foto visible del catálogo. */
  private filtrar(
    productos: ProductoShopify[],
    dto: ListarProductosDto,
  ): ProductoShopify[] {
    const termino = (dto.buscar ?? '').trim().toLowerCase();
    const proveedor = (dto.proveedor ?? '').trim().toLowerCase();
    const { estado, sin_stock } = dto;

    if (!termino && !estado && !sin_stock && !proveedor) return productos;

    return productos.filter((p) => {
      if (termino && !p.titulo.toLowerCase().includes(termino)) return false;
      if (estado && p.estado !== estado) return false;
      if (sin_stock && p.stock > 0) return false;
      if (proveedor && (p.proveedor ?? '').toLowerCase() !== proveedor) {
        return false;
      }
      return true;
    });
  }

  /** Sin orden explícito se respeta el orden nativo de Shopify. */
  private ordenar(
    productos: ProductoShopify[],
    orden?: OrdenProductos,
    direccion?: DireccionOrden,
  ): ProductoShopify[] {
    if (!orden) return productos;
    const factor = direccion === 'desc' ? -1 : 1;
    return [...productos].sort((a, b) => factor * this.comparar(a, b, orden));
  }

  private comparar(
    a: ProductoShopify,
    b: ProductoShopify,
    orden: OrdenProductos,
  ): number {
    switch (orden) {
      case 'precio':
        return a.precio_min - b.precio_min;
      case 'stock':
        return a.stock - b.stock;
      case 'variantes':
        return a.variantes.length - b.variantes.length;
      case 'creado':
        return new Date(a.creado).getTime() - new Date(b.creado).getTime();
      case 'titulo':
      default:
        return a.titulo.localeCompare(b.titulo, 'es', { sensitivity: 'base' });
    }
  }

  /** Datos de las tarjetas KPI: siempre sobre el catálogo completo, no la búsqueda. */
  resumen(): {
    productos: number;
    variantes: number;
    variantes_sin_stock: number;
    unidades: number;
    proveedores: string[];
  } {
    const todos = this.catalogoVisible();
    const proveedores = [
      ...new Set(
        todos.map((p) => p.proveedor?.trim()).filter((p): p is string => !!p),
      ),
    ].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

    return {
      productos: todos.length,
      variantes: todos.reduce((s, p) => s + p.variantes.length, 0),
      variantes_sin_stock: todos.reduce(
        (s, p) => s + p.variantes.filter((v) => v.stock <= 0).length,
        0,
      ),
      unidades: todos.reduce((s, p) => s + p.stock, 0),
      proveedores,
    };
  }

  cacheVigente(): boolean {
    return (
      this.catalogo !== null && Date.now() - this.cacheadoEn < TTL_CACHE_MS
    );
  }

  invalidarCache(): void {
    this.catalogo = null;
    this.cacheadoEn = 0;
  }

  async sincronizar(): Promise<{
    ok: boolean;
    mensaje: string;
    productos: number;
  }> {
    this.invalidarCache();
    try {
      const catalogo = await this.leerCatalogo();
      this.catalogo = catalogo;
      this.cacheadoEn = Date.now();
      return {
        ok: true,
        mensaje: `Catálogo sincronizado con Shopify (${catalogo.length} producto(s)).`,
        productos: catalogo.length,
      };
    } catch (error) {
      const mensaje =
        error instanceof Error ? error.message : 'Error desconocido.';
      this.logger.error(`No se pudo sincronizar el catálogo: ${mensaje}`);
      return { ok: false, mensaje, productos: 0 };
    }
  }

  /**
   * Asegura el catálogo en caché antes de paginarlo. Las peticiones simultáneas
   * comparten la misma lectura para no disparar varias consultas idénticas a
   * Shopify, que es lo que pasaba con el `sincronizar` de usar y volver.
   */
  async asegurarCatalogo(): Promise<void> {
    if (this.cacheVigente() && this.catalogo) return;
    if (this.lecturaEnCurso) {
      await this.lecturaEnCurso;
      return;
    }

    this.lecturaEnCurso = this.leerCatalogo()
      .then((catalogo) => {
        this.catalogo = catalogo;
        this.cacheadoEn = Date.now();
        return catalogo;
      })
      .finally(() => {
        this.lecturaEnCurso = null;
      });

    try {
      await this.lecturaEnCurso;
    } catch (error) {
      const mensaje =
        error instanceof Error ? error.message : 'Error desconocido.';
      throw new Error(`No se pudo leer el catálogo de Shopify: ${mensaje}`);
    }
  }

  private async leerCatalogo(): Promise<ProductoShopify[]> {
    const catalogo: ProductoShopify[] = [];
    let cursor: string | null = null;
    let pagina = 0;

    do {
      pagina += 1;
      const resultado = await this.credenciales.conReintento((datos) =>
        this.graphql.ejecutar<{
          products: {
            pageInfo: { hasNextPage: boolean; endCursor: string | null };
            edges: { node: unknown }[];
          };
        }>(
          datos.token,
          datos.shop,
          CONSULTA_CATALOGO,
          { first: PRODUCTOS_POR_PAGINA, after: cursor },
          'catalogo de productos',
        ),
      );

      if (!resultado.ok) throw new Error(resultado.mensaje);
      const productos = resultado.datos?.products;
      if (!productos) break;

      for (const edge of productos.edges) {
        const producto = mapearProducto(edge.node, {
          avisar: (mensaje) => this.logger.warn(mensaje),
        });
        if (producto) catalogo.push(producto);
      }

      const info = productos.pageInfo;
      cursor = info.hasNextPage ? info.endCursor : null;
      if (cursor && pagina >= MAX_PAGINAS_CATALOGO) {
        this.logger.warn(
          `El catálogo de Shopify supera ${PRODUCTOS_POR_PAGINA * MAX_PAGINAS_CATALOGO} productos; se truncó la lectura.`,
        );
        cursor = null;
      }
    } while (cursor);

    return catalogo;
  }

  async obtener(id: string): Promise<ResultadoProducto<ProductoShopify>> {
    const resultado = await this.credenciales.conReintento((datos) =>
      this.graphql.ejecutar<{ product: unknown }>(
        datos.token,
        datos.shop,
        CONSULTA_PRODUCTO,
        { id },
        `producto ${id}`,
      ),
    );
    if (!resultado.ok) {
      return { ok: false, mensaje: resultado.mensaje, producto: null };
    }
    const producto = mapearProducto(resultado.datos?.product, {
      avisar: (mensaje) => this.logger.warn(mensaje),
    });
    if (!producto) {
      return {
        ok: false,
        mensaje: 'El producto no existe en Shopify o fue eliminado.',
        producto: null,
      };
    }
    return { ok: true, mensaje: 'ok', producto };
  }

  /**
   * Tras una escritura deja el catálogo en caché con el producto ya
   * actualizado, en vez de invalidarlo. Invalidar obligaba a releer hasta
   * `MAX_PAGINAS_CATALOGO` páginas de Shopify en la siguiente visita al
   * catálogo, por cada campo guardado.
   *
   * Como un guardado toca varios campos y cada uno llega por su propia vía, los
   * refrescos se coalescen: cinco escrituras seguidas del mismo producto probed
   * una o dos lecturas en vez de cinco.
   */
  refrescar(id: string): void {
    if (this.catalogo === null) return;
    if (!this.catalogo.some((p) => p.id_producto === id)) {
      // El producto no estaba en la foto del catálogo: no se completa una lista
      // a medias, se relee entera la próxima vez.
      this.invalidarCache();
      return;
    }

    this.refreshPendiente.add(id);
    if (this.refreshEnCurso.has(id)) return;
    this.refreshEnCurso.add(id);

    void (async () => {
      try {
        while (this.refreshPendiente.delete(id)) {
          const leido = await this.obtener(id);
          if (!leido.ok || !leido.producto || !this.catalogo) continue;
          const indice = this.catalogo.findIndex((p) => p.id_producto === id);
          if (indice >= 0) {
            this.catalogo[indice] = leido.producto;
            this.cacheadoEn = Date.now();
          }
        }
      } catch {
        this.invalidarCache();
      } finally {
        this.refreshEnCurso.delete(id);
      }
    })();
  }

  /** Marca un producto como borrado para ocultarlo mientras Shopify lo siga devolviendo. */
  registrarBorrado(id: string): void {
    this.borradosRecientes.set(id, Date.now());
  }
}
