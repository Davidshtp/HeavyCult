"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  FilmIcon,
  MegaphoneIcon,
  MessageCircleIcon,
  PackageIcon,
  PencilIcon,
  PlugIcon,
  PlusIcon,
  Trash2Icon,
  TruckIcon,
  type LucideIcon,
} from "lucide-react";
import { IntegracionFormModal } from "@/components/dashboard/configuraciones/integracion-form";
import { SectionHeader } from "@/components/dashboard/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PLATAFORMA_INTEGRACION_LABEL,
} from "@/lib/dashboard-mock";
import {
  actualizarIntegracion,
  eliminarIntegracion,
  listarIntegraciones,
  probarConexionIntegracion,
} from "@/lib/dashboard-api";
import type { Integracion, PlataformaIntegracion } from "@/lib/types";
import { formatFecha } from "@/lib/format";

const ICONOS_PLATAFORMA: Record<PlataformaIntegracion, LucideIcon> = {
  META_ADS: MegaphoneIcon,
  TIKTOK: FilmIcon,
  WHATSAPP: MessageCircleIcon,
  DROPI: PackageIcon,
  SERVIENTREGA: TruckIcon,
  INTER_RAPIDISIMO: TruckIcon,
  COORDINADORA: TruckIcon,
  ENVIA: TruckIcon,
};

export function IntegracionesPanel() {
  const [conexiones, setConexiones] = useState<Integracion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState<{ abierto: boolean; conexion: Integracion | null }>({
    abierto: false,
    conexion: null,
  });

  async function recargar() {
    setConexiones(await listarIntegraciones());
  }

  useEffect(() => {
    (async () => {
      try {
        await recargar();
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  async function manejarActivo(conexion: Integracion) {
    const activo = !conexion.activo;
    await actualizarIntegracion(conexion.id_integracion, { activo });
    setConexiones((prev) =>
      prev.map((c) => (c.id_integracion === conexion.id_integracion ? { ...c, activo } : c)),
    );
    toast.success(activo ? "Conexión activada." : "Conexión desactivada.");
  }

  async function manejarProbar(conexion: Integracion) {
    const ok = await probarConexionIntegracion(conexion.id_integracion);
    if (ok) {
      toast.success("Conexión verificada correctamente (maquetación).");
    } else {
      toast.error("La conexión no respondió: revisa la clave (maquetación).");
    }
  }

  async function manejarEliminar(conexion: Integracion) {
    if (
      !window.confirm(
        `¿Eliminar la conexión "${conexion.etiqueta}"? La acción no se puede deshacer.`,
      )
    ) {
      return;
    }
    await eliminarIntegracion(conexion.id_integracion);
    setConexiones((prev) =>
      prev.filter((c) => c.id_integracion !== conexion.id_integracion),
    );
    toast.success("Conexión eliminada (maquetación).");
  }

  async function manejarGuardado() {
    await recargar();
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Conexiones · API keys"
        description={`${conexiones.length} conexiones configuradas · las claves se muestran siempre enmascaradas`}
        action={
          <Button
            className="bg-linear-to-r from-brand-600 to-violet-600 hover:from-brand-600 hover:to-violet-600 hover:opacity-90"
            onClick={() => setModal({ abierto: true, conexion: null })}
          >
            <PlusIcon className="size-4" />
            Agregar conexión
          </Button>
        }
      />

      {cargando ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : conexiones.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-base text-muted-foreground">
              Aún no hay conexiones configuradas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {conexiones.map((conexion) => {
            const Icon = ICONOS_PLATAFORMA[conexion.plataforma];
            return (
              <Card key={conexion.id_integracion} className="gap-3">
                <CardContent className="flex h-full flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-brand-500/25 bg-brand-500/10">
                      <Icon className="size-5 text-brand-400" />
                    </span>
                    <Badge
                      variant="outline"
                      className={
                        conexion.activo
                          ? "border-transparent bg-emerald-500/15 text-emerald-300"
                          : "border-white/10 text-muted-foreground"
                      }
                    >
                      <span
                        className={`size-1.5 rounded-full ${conexion.activo ? "bg-emerald-400" : "bg-muted-foreground"}`}
                      />
                      {conexion.activo ? "Activa" : "Inactiva"}
                    </Badge>
                  </div>

                  <div>
                    <p className="font-mono text-[0.75rem] tracking-[0.15em] text-muted-foreground uppercase">
                      {PLATAFORMA_INTEGRACION_LABEL[conexion.plataforma]}
                    </p>
                    <p className="mt-1 text-base font-medium">{conexion.etiqueta}</p>
                    <p className="mt-1 font-mono text-[0.85rem] text-brand-300/80">
                      api_key · {conexion.api_key_enmascarada}
                    </p>
                    <p className="mt-1 text-[0.8rem] text-muted-foreground">
                      Conectada el {formatFecha(conexion.fecha_creacion)}
                    </p>
                  </div>

                  <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => manejarProbar(conexion)}
                    >
                      <PlugIcon className="size-3.5" />
                      Probar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => manejarActivo(conexion)}
                    >
                      {conexion.activo ? "Desactivar" : "Activar"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setModal({ abierto: true, conexion })}
                      aria-label={`Editar ${conexion.etiqueta}`}
                    >
                      <PencilIcon className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => manejarEliminar(conexion)}
                      aria-label={`Eliminar ${conexion.etiqueta}`}
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <IntegracionFormModal
        open={modal.abierto}
        conexion={modal.conexion}
        onOpenChange={(abierto) =>
          setModal((m) => ({ ...m, abierto, conexion: abierto ? m.conexion : null }))
        }
        onSaved={manejarGuardado}
      />
    </div>
  );
}