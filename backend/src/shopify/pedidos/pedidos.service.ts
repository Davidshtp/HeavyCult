import { Injectable } from '@nestjs/common';
import { ShopifyCredentialsService } from '../core/shopify-credentials.service';
import { ShopifyGraphqlService } from '../core/shopify-graphql.service';
import { CrearPedidoDto } from './dto/crear-pedido.dto';
import {
  CONSULTA_LISTAR_PEDIDOS,
  CONSULTA_PEDIDO,
  MUTACION_CREAR_PEDIDO,
  PEDIDOS_POR_PAGINA,
} from './pedidos.graphql';
import { mapearPaginaPedidos, mapearPedidoDetalle } from './pedidos.mapper';
import type {
  PaginaPedidos,
  PedidoDetalle,
  ResultadoPedido,
} from './pedidos.types';

interface LineaShopify {
  variantId: string;
  quantity: number;
}

interface DireccionShopify {
  firstName: string;
  lastName: string;
  address1: string;
  city: string;
  province: string;
  countryCode: string;
  phone: string;
}

/** Los pedidos siempre se envían dentro de Colombia. */
const CODIGO_PAIS = 'CO';

/**
 * Pedidos en Shopify vía GraphQL (`orderCreate`). Shopify es la fuente de
 * verdad del listado y el detalle: acá no se guarda nada en la base local.
 *
 * `financialStatus` por defecto es PENDING porque el flujo es contraentrega:
 * el transportador cobra al recibir, la orden queda abierta hasta confirmarlo.
 */
@Injectable()
export class ShopifyPedidosService {
  constructor(
    private readonly graphql: ShopifyGraphqlService,
    private readonly credenciales: ShopifyCredentialsService,
  ) {}

  async crearPedido(dto: CrearPedidoDto): Promise<ResultadoPedido> {
    const resultado = await this.credenciales.conReintento((datos) =>
      this.graphql.ejecutar<{
        orderCreate: {
          order: {
            id: string;
            name: string;
            displayFinancialStatus: string | null;
            currentTotalPriceSet: {
              shopMoney: { amount: string | null } | null;
            } | null;
          } | null;
          userErrors: { field: string[]; message: string }[];
        };
      }>(
        datos.token,
        datos.shop,
        MUTACION_CREAR_PEDIDO,
        {
          order: construirPedido(dto),
          options: { sendReceipt: false },
        },
        'crear pedido',
      ),
    );

    if (!resultado.ok) {
      return { ok: false, mensaje: resultado.mensaje };
    }

    const respuesta = resultado.datos?.orderCreate;
    const errores = respuesta?.userErrors ?? [];
    if (!respuesta?.order || errores.length > 0) {
      const detalle = errores.map((error) => error.message).join(' | ');
      return {
        ok: false,
        mensaje:
          detalle || 'Shopify no pudo crear el pedido sin dar más detalle.',
      };
    }

    return {
      ok: true,
      mensaje: `Pedido creado en Shopify (${respuesta.order.name}).`,
      pedido: {
        id_pedido: respuesta.order.id,
        numero: respuesta.order.name,
        estado_financiero: respuesta.order.displayFinancialStatus ?? 'PENDING',
        total:
          Number(
            respuesta.order.currentTotalPriceSet?.shopMoney?.amount ?? '0',
          ) || 0,
        creado: new Date().toISOString(),
        cliente: null,
        nota: dto.nota ?? null,
        ciudad: dto.direccion_envio.ciudad,
        departamento: dto.direccion_envio.departamento,
      },
    };
  }

  async listar(
    cursor: string | null,
  ): Promise<{ ok: boolean; mensaje: string; pagina: PaginaPedidos | null }> {
    const resultado = await this.credenciales.conReintento((datos) =>
      this.graphql.ejecutar<unknown>(
        datos.token,
        datos.shop,
        CONSULTA_LISTAR_PEDIDOS,
        { first: PEDIDOS_POR_PAGINA, ...(cursor ? { after: cursor } : {}) },
        'listar pedidos',
      ),
    );

    if (!resultado.ok) {
      return { ok: false, mensaje: resultado.mensaje, pagina: null };
    }

    return {
      ok: true,
      mensaje: 'ok',
      pagina: mapearPaginaPedidos(resultado.datos),
    };
  }

  async obtener(
    id: string,
  ): Promise<{ ok: boolean; mensaje: string; pedido: PedidoDetalle | null }> {
    const resultado = await this.credenciales.conReintento((datos) =>
      this.graphql.ejecutar<unknown>(
        datos.token,
        datos.shop,
        CONSULTA_PEDIDO,
        { id },
        `obtener pedido ${id}`,
      ),
    );

    if (!resultado.ok) {
      return { ok: false, mensaje: resultado.mensaje, pedido: null };
    }

    const pedido = mapearPedidoDetalle(resultado.datos);
    if (!pedido) {
      return {
        ok: false,
        mensaje: 'No se encontró el pedido en Shopify.',
        pedido: null,
      };
    }
    return { ok: true, mensaje: 'ok', pedido };
  }
}

function construirPedido(dto: CrearPedidoDto): Record<string, unknown> {
  const cliente = dto.cliente;
  const direccion = dto.direccion_envio;

  const lineItems: LineaShopify[] = dto.items.map((item) => ({
    variantId: item.id_variante,
    quantity: item.cantidad,
  }));

  const direccionCompleta: DireccionShopify = {
    firstName: cliente.nombre,
    lastName: cliente.apellido,
    address1: direccion.calle,
    city: direccion.ciudad,
    province: direccion.departamento,
    countryCode: CODIGO_PAIS,
    phone: cliente.telefono,
  };

  const order: Record<string, unknown> = {
    lineItems,
    email: cliente.email,
    // El teléfono es obligatorio para Dropi (sincroniza los pedidos como
    // contraentrega): con `orderCreate` sin teléfono, Dropify responde
    // «Debe ingresar un número celular» al intentar enviar la orden.
    phone: cliente.telefono,
    customer: {
      toUpsert: {
        email: cliente.email,
        phone: cliente.telefono,
        firstName: cliente.nombre,
        lastName: cliente.apellido,
      },
    },
    financialStatus: (dto.estado_financiero ?? 'pending').toUpperCase(),
    shippingAddress: direccionCompleta,
    billingAddress: direccionCompleta,
  };
  if (dto.nota) order.note = dto.nota;

  return order;
}
