import type {
  PaginaPedidos,
  PedidoDetalle,
  PedidoListado,
} from './pedidos.types';

/** Transforman los nodos crudos de Shopify en los tipos del panel. */

export function mapearPedidoListado(nodo: unknown): PedidoListado | null {
  if (!nodo || typeof nodo !== 'object') return null;
  const n = nodo as Record<string, unknown>;

  const direccion = leerObjeto(n['shippingAddress']);

  return {
    id_pedido: texto(n['id']),
    numero: texto(n['name']),
    estado_financiero: texto(n['displayFinancialStatus']),
    total: leerMonto(n['currentTotalPriceSet']) ?? 0,
    creado: texto(n['createdAt']),
    cliente: nombreCompletoCliente(direccion, texto(n['email'])),
    nota: texto(n['note']) || null,
    ciudad: texto(direccion?.['city']) || null,
    departamento: texto(direccion?.['province']) || null,
  };
}

export function mapearPaginaPedidos(data: unknown): PaginaPedidos {
  const orders = leerObjeto(data)?.['orders'];
  const edges = leerLista(orders, 'edges');
  const pageInfo = leerObjeto(orders?.['pageInfo']);

  const pedidos: PedidoListado[] = [];
  for (const edge of edges) {
    const pedido = mapearPedidoListado(leerObjeto(edge)?.['node']);
    if (pedido) pedidos.push(pedido);
  }

  return {
    pedidos,
    tiene_mas: pageInfo?.['hasNextPage'] === true,
    cursor_siguiente: texto(pageInfo?.['endCursor']) || null,
  };
}

export function mapearPedidoDetalle(data: unknown): PedidoDetalle | null {
  const n = leerObjeto(data)?.['order'];
  if (!n) return null;

  const direccion = leerObjeto(n['shippingAddress']);
  const items = leerLista(n['lineItems'], 'nodes');

  return {
    id_pedido: texto(n['id']),
    numero: texto(n['name']),
    estado_financiero: texto(n['displayFinancialStatus']),
    total: leerMonto(n['currentTotalPriceSet']) ?? 0,
    moneda: texto(n['currencyCode']) || 'COP',
    creado: texto(n['createdAt']),
    nota: texto(n['note']) || null,
    cliente: {
      nombre: texto(direccion?.['firstName']) || null,
      apellido: texto(direccion?.['lastName']) || null,
      email: texto(n['email']) || null,
      telefono: texto(n['phone']) || null,
    },
    direccion_envio: {
      calle: texto(direccion?.['address1']),
      departamento: texto(direccion?.['province']),
      ciudad: texto(direccion?.['city']),
      pais: texto(direccion?.['countryCodeV2']),
      codigo_postal: texto(direccion?.['zip']) || null,
    },
    items:
      items.length > 0
        ? items
            .map(mapearItemListado)
            .filter((item): item is NonNullable<typeof item> => item !== null)
        : null,
  };
}

function mapearItemListado(bruto: unknown) {
  const n = leerObjeto(bruto);
  if (!n) return null;
  const precioSet = leerObjeto(n['originalUnitPriceSet']);
  const precio = leerObjeto(precioSet?.['shopMoney']);
  const variante = leerObjeto(n['variant']);
  const producto = leerObjeto(n['product']);
  return {
    id: texto(n['id']),
    titulo: texto(n['title']),
    cantidad: Math.max(0, Math.trunc(leerNumero(n['quantity']) ?? 0)),
    sku: texto(n['sku']) || null,
    precio_unitario: leerNumero(precio?.['amount']),
    variante: texto(variante?.['title']) || null,
    producto: texto(producto?.['title']) || null,
  };
}

export function texto(valor: unknown): string {
  if (typeof valor === 'string') return valor;
  if (typeof valor === 'number' && Number.isFinite(valor)) return String(valor);
  return '';
}

export function leerObjeto(valor: unknown): Record<string, unknown> | null {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return null;
  return valor as Record<string, unknown>;
}

export function leerLista(valor: unknown, clave: string): unknown[] {
  const lista = leerObjeto(valor)?.[clave];
  return Array.isArray(lista) ? lista : [];
}

export function leerNumero(valor: unknown): number | null {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  if (typeof valor !== 'string' || valor.trim() === '') return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

/** Lee el monto de un `MoneyBag` de Shopify («currentTotalPriceSet { shopMoney { amount } }»). */
function leerMonto(valor: unknown): number | null {
  return leerNumero(leerObjeto(leerObjeto(valor)?.['shopMoney'])?.['amount']);
}

/** Nombre legible del cliente a partir de la dirección de envío (sin scope read_customers). */
function nombreCompletoCliente(
  direccion: Record<string, unknown> | null,
  email: string,
): string | null {
  const nombres = [
    texto(direccion?.['firstName']),
    texto(direccion?.['lastName']),
  ].filter(Boolean);
  return nombres.join(' ') || email || null;
}
