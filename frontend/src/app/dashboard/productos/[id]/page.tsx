import { ProductoDetallePanel } from "@/components/dashboard/productos/producto-detalle-panel";

// El id de Shopify es un GID con "://" y "/", así que el frontend lo mete
// codificado en la URL. Este es el único punto donde se sabe si llegó
// codificado: si viniera dos veces, "decodeURIComponent" sacaría un solo nivel
// y Shopify seguiría rechazándolo, por eso el panel no vuelve a codificar.
export default async function ProductoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let productoId = id;
  if (productoId.includes("%")) {
    try {
      productoId = decodeURIComponent(productoId);
    } catch {
      // Si el porcentaje está mal formado se deja tal cual: el backend
      // responde con un error claro en vez de romper la página.
    }
  }

  return <ProductoDetallePanel id={productoId} />;
}