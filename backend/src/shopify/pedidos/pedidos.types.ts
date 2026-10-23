export interface PedidoListado {
  id_pedido: string;
  numero: string;
  estado_financiero: string;
  total: number;
  creado: string;
  cliente: string | null;
  nota: string | null;
  ciudad: string | null;
  departamento: string | null;
}

export interface PedidoDetalle {
  id_pedido: string;
  numero: string;
  estado_financiero: string;
  total: number;
  moneda: string;
  creado: string;
  nota: string | null;
  cliente: {
    nombre: string | null;
    apellido: string | null;
    email: string | null;
    telefono: string | null;
  } | null;
  direccion_envio: {
    calle: string;
    departamento: string;
    ciudad: string;
    pais: string;
    codigo_postal: string | null;
  } | null;
  items:
    | {
        id: string;
        titulo: string;
        cantidad: number;
        sku: string | null;
        precio_unitario: number | null;
        variante: string | null;
        producto: string | null;
      }[]
    | null;
}

export interface PaginaPedidos {
  pedidos: PedidoListado[];
  tiene_mas: boolean;
  cursor_siguiente: string | null;
}

export interface ResultadoPedido {
  ok: boolean;
  mensaje: string;
  pedido?: PedidoListado;
  status?: number;
}

export type EstadoFinancieroPedido =
  | 'PENDING'
  | 'AUTHORIZED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED'
  | 'VOIDED';
