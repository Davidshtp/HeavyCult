"use client";

import { useSearchParams } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  Loader2Icon,
  PackagePlusIcon,
} from "lucide-react";
import { SectionHeader } from "@/components/dashboard/section-header";
import { useTituloPagina } from "@/components/dashboard/topbar-titulo";
import { Button } from "@/components/ui/button";
import { IndicadorPasos } from "./nuevo/indicador-pasos";
import { PasoCliente } from "./nuevo/paso-cliente";
import { PasoConfirmar } from "./nuevo/paso-confirmar";
import { PasoEnvio } from "./nuevo/paso-envio";
import { PasoProducto } from "./nuevo/paso-producto";
import { ReciboPedido } from "./nuevo/recibo-pedido";
import { PASOS } from "./nuevo/tipos";
import { useNuevoPedido } from "./nuevo/use-nuevo-pedido";

export function NuevoPedidoPanel() {
  const parametros = useSearchParams();
  const productoInicial = parametros.get("producto");
  useTituloPagina("Nuevo pedido");
  const pedido = useNuevoPedido(productoInicial);

  const esUltimo = pedido.paso === PASOS.length - 1;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Nuevo pedido"
        description="Contraentrega. El pedido se crea directo en Shopify."
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          <IndicadorPasos
            paso={pedido.paso}
            pasosValidos={pedido.pasosValidos}
            onIr={pedido.irA}
          />

          <div
            key={pedido.paso}
            className="animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            {pedido.paso === 0 && <PasoProducto pedido={pedido} />}
            {pedido.paso === 1 && <PasoCliente pedido={pedido} />}
            {pedido.paso === 2 && <PasoEnvio pedido={pedido} />}
            {pedido.paso === 3 && <PasoConfirmar pedido={pedido} />}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-white/5 pt-4">
            <Button
              variant="ghost"
              onClick={pedido.retroceder}
              disabled={pedido.paso === 0}
            >
              <ArrowLeftIcon className="size-4" /> Atrás
            </Button>
            {esUltimo ? (
              <Button
                size="lg"
                onClick={pedido.enviar}
                disabled={pedido.enviando}
              >
                {pedido.enviando ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <PackagePlusIcon className="size-4" />
                )}
                Crear pedido
              </Button>
            ) : (
              <Button size="lg" onClick={pedido.avanzar}>
                Siguiente <ArrowRightIcon className="size-4" />
              </Button>
            )}
          </div>
        </div>

        <ReciboPedido pedido={pedido} className="lg:sticky lg:top-6" />
      </div>
    </div>
  );
}
