import { PedidoDetallePanel } from "@/components/dashboard/pedidos/pedido-detalle-panel";

// El id de Shopify es un GID con "://" y "/", así que el frontend lo mete
// codificado en la URL (igual que con los productos).
export default async function PedidoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let pedidoId = id;
  if (pedidoId.includes("%")) {
    try {
      pedidoId = decodeURIComponent(pedidoId);
    } catch {
      // Si el porcentaje está mal formado se deja tal cual: el backend
      // responde con un error claro en vez de romper la página.
    }
  }

  return <PedidoDetallePanel id={pedidoId} />;
}