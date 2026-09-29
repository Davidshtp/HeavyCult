import { Injectable } from '@nestjs/common';
import { CrearPedidoDto } from './dto/crear-pedido.dto';
import { normalizarShopHost } from './util/normalizar-shop';

const VERSION_API = '2026-07';
const TIEMPO_ESPERA_MS = 10000;

export interface ResultadoPrueba {
  ok: boolean;
  mensaje: string;
}

export interface DatosPedidoCreado {
  id_pedido: number;
  numero: string;
  total: number;
  estado_financiero: string;
}

export interface ResultadoPedido {
  ok: boolean;
  mensaje: string;
  pedido?: DatosPedidoCreado;
  status?: number;
}

@Injectable()
export class ShopifyService {
  async probarConexionConShop(
    token: string,
    shop: string,
  ): Promise<ResultadoPrueba> {
    const shopHost = normalizarShopHost(shop);
    return this.probarConexionEn(
      token,
      `https://${shopHost}/admin/api/${VERSION_API}/shop.json`,
      shopHost,
    );
  }

  private async probarConexionEn(
    token: string,
    url: string,
    tienda: string,
  ): Promise<ResultadoPrueba> {
    const controlador = new AbortController();
    const temporizador = setTimeout(
      () => controlador.abort(),
      TIEMPO_ESPERA_MS,
    );

    try {
      const respuesta = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': token,
          Accept: 'application/json',
        },
        signal: controlador.signal,
      });
      const cuerpo: unknown = await respuesta.json().catch(() => null);

      if (respuesta.ok) {
        const shopObj =
          cuerpo && typeof cuerpo === 'object'
            ? (cuerpo as Record<string, unknown>).shop
            : null;
        const nombre = extraerCampo(shopObj, 'name');
        return {
          ok: true,
          mensaje: `Conexión verificada con Shopify${nombre ? ` (${nombre})` : ''}.`,
        };
      }

      const detalle = extraerDetalleError(cuerpo);

      if (respuesta.status === 401) {
        return {
          ok: false,
          mensaje:
            'El token de Shopify fue rechazado (401). Regenera el token en Configuración → Apps → Desarrollar apps.',
        };
      }
      if (respuesta.status === 403) {
        return {
          ok: false,
          mensaje:
            'El token es válido pero la app no tiene los scopes necesarios. Verifica los scopes de Admin API en la app de Shopify.',
        };
      }
      if (respuesta.status === 404) {
        return {
          ok: false,
          mensaje: `No se encontró la tienda Shopify (${tienda}).`,
        };
      }
      if (respuesta.status === 429) {
        return {
          ok: false,
          mensaje:
            'Shopify rechazó la petición por límite de uso (HTTP 429). Intenta nuevamente en un momento.',
        };
      }

      return {
        ok: false,
        mensaje: `Shopify respondió con un error (HTTP ${respuesta.status})${detalle ? `: ${detalle}` : '.'}`,
      };
    } catch {
      return {
        ok: false,
        mensaje:
          'No se pudo contactar la API de Shopify (sin respuesta o tiempo agotado).',
      };
    } finally {
      clearTimeout(temporizador);
    }
  }

  async crearPedido(
    token: string,
    shop: string,
    dto: CrearPedidoDto,
  ): Promise<ResultadoPedido> {
    const shopHost = normalizarShopHost(shop);
    const url = `https://${shopHost}/admin/api/${VERSION_API}/orders.json`;
    const controlador = new AbortController();
    const temporizador = setTimeout(
      () => controlador.abort(),
      TIEMPO_ESPERA_MS,
    );

    try {
      const respuesta = await fetch(url, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': token,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ order: this.mapearPedido(dto) }),
        signal: controlador.signal,
      });
      const cuerpo: unknown = await respuesta.json().catch(() => null);

      if (respuesta.status === 201) {
        const pedidoObj =
          cuerpo && typeof cuerpo === 'object'
            ? (cuerpo as Record<string, unknown>).order
            : null;
        const pedido = pedidoObj as Record<string, unknown> | null;
        const numero = extraerCampo(pedido, 'name') ?? '';
        const id = extraerCampo(pedido, 'id');
        const total = extraerCampo(pedido, 'total_price');
        return {
          ok: true,
          mensaje: `Pedido creado en Shopify${numero ? ` (#${numero})` : ''}.`,
          pedido: {
            id_pedido: id ? Number(id) : NaN,
            numero,
            total: total ? Number(total) : 0,
            estado_financiero: extraerCampo(pedido, 'financial_status') ?? '',
          },
        };
      }

      const detalle =
        extraerDetalleError(cuerpo) ?? this.extraerErroresCampos(cuerpo);

      if (respuesta.status === 401) {
        return {
          ok: false,
          status: 401,
          mensaje:
            'El token de Shopify fue rechazado (401). Regenera el token en Configuración → Apps → Desarrollar apps.',
        };
      }
      if (respuesta.status === 403) {
        return {
          ok: false,
          mensaje:
            'El token es válido pero la app no tiene el scope write_orders. Agrégalo en Admin API scopes de la app.',
        };
      }
      if (respuesta.status === 404) {
        return {
          ok: false,
          mensaje: `No se encontró la tienda Shopify (${shopHost}).`,
        };
      }
      if (respuesta.status === 429) {
        return {
          ok: false,
          mensaje:
            'Shopify rechazó la petición por límite de uso (HTTP 429). Intenta nuevamente en un momento.',
        };
      }

      return {
        ok: false,
        mensaje: `Shopify no pudo crear el pedido (HTTP ${respuesta.status})${detalle ? `: ${detalle}` : '.'}`,
      };
    } catch {
      return {
        ok: false,
        mensaje:
          'No se pudo contactar la API de Shopify (sin respuesta o tiempo agotado).',
      };
    } finally {
      clearTimeout(temporizador);
    }
  }

  private mapearPedido(dto: CrearPedidoDto): Record<string, unknown> {
    const c = dto.cliente;
    const d = c.direccion;

    const cliente: Record<string, string> = {
      first_name: c.nombre,
      last_name: c.apellido,
      phone: c.telefono,
    };
    if (c.email) cliente.email = c.email;

    const direccion: Record<string, string> = {
      first_name: c.nombre,
      last_name: c.apellido,
      address1: d.calle,
      city: d.ciudad,
      province: d.departamento,
      country: d.pais,
      phone: c.telefono,
    };
    if (d.codigo_postal) direccion.zip = d.codigo_postal;

    const items = dto.items.map((item) => {
      const base: Record<string, unknown> = {
        title: item.titulo,
        price: item.precio.toFixed(2),
        quantity: item.cantidad,
      };
      if (item.sku) base.sku = item.sku;
      return base;
    });

    const pedido: Record<string, unknown> = {
      line_items: items,
      customer: cliente,
      shipping_address: direccion,
      financial_status: dto.estado_financiero ?? 'pending',
      send_receipt: false,
    };
    if (dto.nota) pedido.note = dto.nota;

    return pedido;
  }

  private extraerErroresCampos(cuerpo: unknown): string | null {
    if (!cuerpo || typeof cuerpo !== 'object') return null;
    const errores = (cuerpo as Record<string, unknown>).errors;
    if (errores === null || errores === undefined) return null;
    return stringificarValor(errores);
  }
}

function extraerDetalleError(cuerpo: unknown): string | null {
  const campo = extraerCampo(cuerpo, 'message');
  return (
    campo ?? extraerCampo(cuerpo, 'error') ?? extraerCampo(cuerpo, 'mensaje')
  );
}

function extraerCampo(objeto: unknown, clave: string): string | null {
  if (!objeto || typeof objeto !== 'object') return null;
  const valor = (objeto as Record<string, unknown>)[clave];
  if (valor === null || valor === undefined) return null;
  if (typeof valor === 'string' && valor.trim()) return valor.trim();
  return stringificarValor(valor);
}

function stringificarValor(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'string') return valor;
  if (typeof valor === 'symbol') return valor.toString();
  if (typeof valor === 'object' || typeof valor === 'function') {
    try {
      return JSON.stringify(valor);
    } catch {
      return '[valor complejo]';
    }
  }
  return `${valor as number | boolean | bigint}`;
}
