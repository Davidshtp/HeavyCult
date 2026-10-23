import { Suspense } from "react";
import { NuevoPedidoPanel } from "@/components/dashboard/pedidos/nuevo-pedido-panel";

export default function NuevoPedidoPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-8 w-52 animate-pulse rounded-lg bg-white/5" />
          <div className="h-32 animate-pulse rounded-2xl border border-white/10" />
        </div>
      }
    >
      <NuevoPedidoPanel />
    </Suspense>
  );
}