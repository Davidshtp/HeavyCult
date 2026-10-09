import { Injectable } from '@nestjs/common';
import { SHOPIFY_API_VERSION } from '../../config/constants';
import {
  TIEMPO_ESPERA_MS,
  extraerCampo,
  extraerDetalleError,
  stringificarValor,
} from '../common/shopify-http';
import { normalizarShopHost } from '../common/util/normalizar-shop';
import { CrearPedidoDto } from './dto/crear-pedido.dto';

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

/**
 * Alta de pedidos en Shopify (`orders.json`). Va por REST y no por GraphQL
 * porque el flujo del panel arma el pedido completo de una sola vez.
 */
@Injectable()
export class ShopifyPedidosService {
  async crearPedido(
    token: string,
    shop: string,
    dto: CrearPedidoDto,
  ): Promise<ResultadoPedido> {
    const shopHost = normalizarShopHost(shop);
    const url = `https://${shopHost}/admin/api/${SHOPIFY_API_VERSION}/orders.json`;
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
        body: JSON.stringify({ order: mapearPedido(dto) }),
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
        extraerDetalleError(cuerpo) ?? extraerErroresCampos(cuerpo);

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
}

function mapearPedido(dto: CrearPedidoDto): Record<string, unknown> {
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

function extraerErroresCampos(cuerpo: unknown): string | null {
  if (!cuerpo || typeof cuerpo !== 'object') return null;
  const errores = (cuerpo as Record<string, unknown>).errors;
  if (errores === null || errores === undefined) return null;
  return stringificarValor(errores);
}
