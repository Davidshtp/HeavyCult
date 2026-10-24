"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2Icon,
  ClipboardCopyIcon,
  Loader2Icon,
  QrCodeIcon,
  RefreshCwIcon,
  ShieldAlertIcon,
  SmartphoneIcon,
  Trash2Icon,
  UnplugIcon,
  WifiIcon,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { usePerfil } from "@/components/dashboard/perfil-context";
import { SectionHeader } from "@/components/dashboard/section-header";
import { Modal } from "@/components/dashboard/modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "cn";
import {
  conectarInstanciaWhatsapp,
  consultarEstadoInstanciaWhatsapp,
  crearInstanciaWhatsapp,
  desconectarInstanciaWhatsapp,
  eliminarInstanciaWhatsapp,
  listarInstanciasWhatsapp,
  type WhatsappInstancia,
} from "@/lib/whatsapp-api";
import { useWhatsappSocket } from "@/lib/whatsapp-socket";
import {
  ESTADO_INSTANCIA_LABEL,
  colorEstadoInstancia,
} from "@/lib/whatsapp-utils";

function mensajeError(error: unknown, respaldo: string): string {
  return error instanceof Error ? error.message : respaldo;
}

const claseLabel = "text-sm text-white/50";

export function WhatsappConfigPanel() {
  const { usuario, cargando: cargandoPerfil } = usePerfil();
  const esAdmin = usuario?.rol === "ADMIN";

  const [instancias, setInstancias] = useState<WhatsappInstancia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [modalCrear, setModalCrear] = useState(false);
  const [nuevaInstancia, setNuevaInstancia] = useState({
    nombre: "",
    numero: "",
  });
  const [creando, setCreando] = useState(false);

  const [qrAbierto, setQrAbierto] = useState<WhatsappInstancia | null>(null);
  const [ocupada, setOcupada] = useState<number | null>(null);
  const [confirmacion, setConfirmacion] = useState<{
    tipo: "desconectar" | "eliminar";
    instancia: WhatsappInstancia;
  } | null>(null);
  const [procesandoConfirmacion, setProcesandoConfirmacion] = useState(false);

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    try {
      const lista = await listarInstanciasWhatsapp();
      setInstancias(lista);
      setErrorCarga(null);
    } catch (error) {
      if (!silencioso) {
        setErrorCarga(
          mensajeError(error, "No se pudo cargar las instancias de WhatsApp."),
        );
      }
    } finally {
      if (!silencioso) setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (!esAdmin) return;
    void cargar();
  }, [esAdmin, cargar]);

  // Polling cada 4 s mientras alguna instancia está en QR / CONECTANDO
  const pendientes = instancias.some(
    (i) => i.estado === "QR" || i.estado === "CONECTANDO",
  );
  useEffect(() => {
    if (!esAdmin || !pendientes) return;
    const intervalo = setInterval(() => {
      listarInstanciasWhatsapp()
        .then((lista) => {
          setInstancias(lista);
          setQrAbierto((actual) => {
            if (!actual) return null;
            return (
              lista.find((i) => i.id_instancia === actual.id_instancia) ??
              actual
            );
          });
        })
        .catch(() => undefined);
    }, 4000);
    return () => clearInterval(intervalo);
  }, [esAdmin, pendientes]);

  // WebSocket: actualización en tiempo real de QR y estados
  useWhatsappSocket(
    {
      onInstanciaQr: (evento) => {
        setInstancias((prev) =>
          prev.map((i) =>
            i.id_instancia === evento.id_instancia
              ? {
                  ...i,
                  estado: evento.estado,
                  qr_base64: evento.qr_base64,
                  qr_code: evento.qr_code,
                  qr_expira_at: evento.qr_expira_at,
                }
              : i,
          ),
        );
        setQrAbierto((actual) =>
          actual?.id_instancia === evento.id_instancia
            ? {
                ...actual,
                estado: evento.estado,
                qr_base64: evento.qr_base64,
                qr_code: evento.qr_code,
                qr_expira_at: evento.qr_expira_at,
              }
            : actual,
        );
      },
      onInstanciaEstado: (evento) => {
        setInstancias((prev) =>
          prev.map((i) =>
            i.id_instancia === evento.id_instancia
              ? { ...i, estado: evento.estado, numero: evento.numero }
              : i,
          ),
        );
        setQrAbierto((actual) => {
          if (actual?.id_instancia !== evento.id_instancia) return actual;
          if (evento.estado === "CONECTADA") {
            toast.success("¡WhatsApp conectado correctamente!");
            return null;
          }
          return { ...actual, estado: evento.estado, numero: evento.numero };
        });
      },
    },
    esAdmin,
  );

  // Crear instancia y abrir QR automáticamente
  async function crearInstancia() {
    setCreando(true);
    try {
      const instancia = await crearInstanciaWhatsapp({
        nombre: nuevaInstancia.nombre.trim() || undefined,
        numero: nuevaInstancia.numero.trim() || undefined,
      });
      setInstancias((prev) => [instancia, ...prev]);
      setModalCrear(false);
      setNuevaInstancia({ nombre: "", numero: "" });
      setQrAbierto(instancia);
      toast.success("Instancia creada. Escanea el código QR.");
    } catch (error) {
      toast.error(mensajeError(error, "No se pudo crear la instancia."));
    } finally {
      setCreando(false);
    }
  }

  async function conectar(instancia: WhatsappInstancia) {
    setOcupada(instancia.id_instancia);
    try {
      const actualizada = await conectarInstanciaWhatsapp(instancia.id_instancia);
      setInstancias((prev) =>
        prev.map((i) =>
          i.id_instancia === actualizada.id_instancia ? actualizada : i,
        ),
      );
      setQrAbierto(actualizada);
    } catch (error) {
      toast.error(mensajeError(error, "No se pudo generar el código QR."));
    } finally {
      setOcupada(null);
    }
  }

  async function actualizarEstado(instancia: WhatsappInstancia) {
    setOcupada(instancia.id_instancia);
    try {
      const actualizada = await consultarEstadoInstanciaWhatsapp(
        instancia.id_instancia,
      );
      setInstancias((prev) =>
        prev.map((i) =>
          i.id_instancia === actualizada.id_instancia ? actualizada : i,
        ),
      );
    } catch (error) {
      toast.error(mensajeError(error, "No se pudo consultar el estado."));
    } finally {
      setOcupada(null);
    }
  }

  async function confirmarAccion() {
    if (!confirmacion) return;
    setProcesandoConfirmacion(true);
    try {
      if (confirmacion.tipo === "desconectar") {
        const actualizada = await desconectarInstanciaWhatsapp(
          confirmacion.instancia.id_instancia,
        );
        setInstancias((prev) =>
          prev.map((i) =>
            i.id_instancia === actualizada.id_instancia ? actualizada : i,
          ),
        );
        toast.success("Instancia desconectada.");
      } else {
        await eliminarInstanciaWhatsapp(confirmacion.instancia.id_instancia);
        setInstancias((prev) =>
          prev.filter(
            (i) => i.id_instancia !== confirmacion.instancia.id_instancia,
          ),
        );
        toast.success("Instancia eliminada.");
      }
      setConfirmacion(null);
    } catch (error) {
      toast.error(mensajeError(error, "No se pudo completar la acción."));
    } finally {
      setProcesandoConfirmacion(false);
    }
  }

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success("Copiado al portapapeles.");
    } catch {
      toast.error("No se pudo copiar el texto.");
    }
  }

  // ─── Skeletons ───────────────────────────────────────────────────────────────
  if (cargandoPerfil || cargando) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-3 w-64" />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      </div>
    );
  }

  // ─── Solo admin ───────────────────────────────────────────────────────────────
  if (!esAdmin) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <span className="grid size-12 place-items-center rounded-2xl border border-amber-400/20 bg-amber-400/8 text-amber-300">
          <ShieldAlertIcon className="size-5" />
        </span>
        <div>
          <p className="text-sm font-medium text-white/85">
            Acceso restringido
          </p>
          <p className="mt-1 max-w-sm text-sm text-white/45">
            Solo un administrador puede gestionar las conexiones de WhatsApp.
          </p>
        </div>
      </div>
    );
  }

  // ─── Error de carga ────────────────────────────────────────────────────────────
  if (errorCarga) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-destructive">{errorCarga}</p>
        <Button variant="outline" size="sm" onClick={() => void cargar()}>
          <RefreshCwIcon />
          Reintentar
        </Button>
      </div>
    );
  }

  // ─── Sin instancias → invitar a conectar ───────────────────────────────────────
  const sinInstancias = instancias.length === 0;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="WhatsApp"
        description="Gestiona las instancias y vincula números de WhatsApp."
        action={
          !sinInstancias && (
            <Button size="sm" onClick={() => setModalCrear(true)}>
              + Nueva instancia
            </Button>
          )
        }
      />

      {/* Estado vacío: CTA centrado para vincular el primer número */}
      {sinInstancias ? (
        <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-white/12 bg-white/1.5 px-8 py-16 text-center">
          <span className="grid size-16 place-items-center rounded-2xl border border-emerald-400/20 bg-emerald-400/8 text-emerald-300">
            <SmartphoneIcon className="size-7" />
          </span>
          <div className="space-y-1.5">
            <p className="text-base font-semibold text-white/90">
              Conecta tu WhatsApp
            </p>
            <p className="max-w-xs text-sm text-white/45">
              Vincula un número de WhatsApp para empezar a recibir y enviar
              mensajes desde HeavyCult.
            </p>
          </div>
          <Button size="default" onClick={() => setModalCrear(true)}>
            <QrCodeIcon className="size-4" />
            Vincular WhatsApp
          </Button>
        </div>
      ) : (
        /* Lista de instancias */
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-mono text-[0.72rem] tracking-wider text-white/40 uppercase">
              Instancias ({instancias.length})
            </h3>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => void cargar(true)}
            >
              <RefreshCwIcon />
              Actualizar
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {instancias.map((instancia) => (
              <Card
                key={instancia.id_instancia}
                className="border-white/10 bg-white/2.5"
              >
                <CardContent className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {instancia.nombre}
                      </p>
                      <p className="mt-0.5 text-xs text-white/35">
                        {instancia.proveedor === "EVOLUTION_BAILEYS"
                          ? "Evolution · Baileys"
                          : "WhatsApp Cloud API"}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 px-2 py-0.5 text-[0.68rem] text-white/55">
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          colorEstadoInstancia(instancia.estado),
                        )}
                      />
                      {ESTADO_INSTANCIA_LABEL[instancia.estado]}
                    </span>
                  </div>

                  <div className="space-y-1 text-sm">
                    {instancia.estado === "CONECTADA" && instancia.numero ? (
                      <p className="flex items-center gap-1.5 text-emerald-300">
                        <CheckCircle2Icon className="size-3.5" />
                        {instancia.numero}
                      </p>
                    ) : (
                      <p className="text-white/35">Número sin vincular</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {(instancia.estado === "QR" ||
                      instancia.estado === "CONECTANDO") && (
                      <Button
                        size="xs"
                        onClick={() => setQrAbierto(instancia)}
                      >
                        <QrCodeIcon />
                        Ver QR
                      </Button>
                    )}
                    {(instancia.estado === "DESCONECTADA" ||
                      instancia.estado === "ERROR") && (
                      <Button
                        size="xs"
                        onClick={() => void conectar(instancia)}
                        disabled={ocupada === instancia.id_instancia}
                      >
                        {ocupada === instancia.id_instancia ? (
                          <Loader2Icon className="animate-spin" />
                        ) : (
                          <WifiIcon />
                        )}
                        Reconectar
                      </Button>
                    )}
                    {instancia.estado === "CONECTADA" && (
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() =>
                          setConfirmacion({ tipo: "desconectar", instancia })
                        }
                        disabled={ocupada === instancia.id_instancia}
                      >
                        <UnplugIcon />
                        Desconectar
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => void actualizarEstado(instancia)}
                      disabled={ocupada === instancia.id_instancia}
                      aria-label="Actualizar estado"
                    >
                      <RefreshCwIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() =>
                        setConfirmacion({ tipo: "eliminar", instancia })
                      }
                      aria-label="Eliminar instancia"
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Modal: nueva instancia */}
      <Modal
        open={modalCrear}
        onOpenChange={setModalCrear}
        title="Nueva instancia"
        description="Se creará en Evolution API y se generará el código QR para vincular tu WhatsApp."
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setModalCrear(false)}
              disabled={creando}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => void crearInstancia()}
              disabled={creando}
            >
              {creando && <Loader2Icon className="animate-spin" />}
              Crear y vincular
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid gap-1.5">
            <Label htmlFor="wa-nombre-instancia" className={claseLabel}>
              Nombre (opcional)
            </Label>
            <Input
              id="wa-nombre-instancia"
              value={nuevaInstancia.nombre}
              onChange={(e) =>
                setNuevaInstancia((prev) => ({ ...prev, nombre: e.target.value }))
              }
              placeholder="heavycult-principal"
              className="h-10 text-sm"
            />
            <p className="text-xs text-white/30">
              Letras, números y guiones. Si lo dejas vacío se genera
              automáticamente.
            </p>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="wa-numero-instancia" className={claseLabel}>
              Número (opcional)
            </Label>
            <Input
              id="wa-numero-instancia"
              value={nuevaInstancia.numero}
              onChange={(e) =>
                setNuevaInstancia((prev) => ({ ...prev, numero: e.target.value }))
              }
              placeholder="573001234567"
              className="h-10 text-sm"
            />
            <p className="text-xs text-white/30">
              Formato internacional sin +. Si lo dejas vacío se vincula escaneando
              el QR.
            </p>
          </div>
        </div>
      </Modal>

      {/* Modal: código QR */}
      <Modal
        open={!!qrAbierto}
        onOpenChange={(abierto) => {
          if (!abierto) setQrAbierto(null);
        }}
        title="Vincular WhatsApp"
        description="Abre WhatsApp en tu celular → Dispositivos vinculados → Vincular un dispositivo."
      >
        {qrAbierto && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/3 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white/85">
                  {qrAbierto.nombre}
                </p>
                <p className="text-xs text-white/40">
                  {ESTADO_INSTANCIA_LABEL[qrAbierto.estado]}
                  {qrAbierto.numero ? ` · ${qrAbierto.numero}` : ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => void copiar(qrAbierto.webhook_url)}
                aria-label="Copiar URL del webhook"
              >
                <ClipboardCopyIcon />
              </Button>
            </div>

            <div className="flex min-h-64 items-center justify-center rounded-2xl border border-white/10 bg-white p-4">
              {qrAbierto.qr_base64 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrAbierto.qr_base64}
                  alt="Código QR para vincular WhatsApp"
                  className="size-64"
                />
              ) : qrAbierto.qr_code ? (
                <QRCodeSVG
                  value={qrAbierto.qr_code}
                  size={256}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#09090b"
                  title="Código QR para vincular WhatsApp"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-center text-zinc-500">
                  <Loader2Icon className="size-6 animate-spin" />
                  <p className="text-sm">
                    Generando código QR. Se actualizará automáticamente.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-start gap-2 text-xs text-white/35">
              <QrCodeIcon className="mt-0.5 size-3.5 shrink-0" />
              <p>
                El código expira y se renueva solo. Si no aparece, pulsa
                generar otro o cierra y vuelve a abrir.
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!qrAbierto) return;
                  void conectar(qrAbierto);
                }}
                disabled={ocupada === qrAbierto.id_instancia}
              >
                {ocupada === qrAbierto.id_instancia ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  <RefreshCwIcon />
                )}
                Generar otro QR
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: confirmación desconectar / eliminar */}
      <Modal
        open={!!confirmacion}
        onOpenChange={(abierto) => {
          if (!abierto) setConfirmacion(null);
        }}
        title={
          confirmacion?.tipo === "eliminar"
            ? "Eliminar instancia"
            : "Desconectar instancia"
        }
        description={
          confirmacion?.tipo === "eliminar"
            ? "Se eliminará la instancia de Evolution y la sesión local. Esta acción no se puede deshacer."
            : "La sesión se cerrará y dejarás de recibir mensajes hasta reconectar."
        }
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmacion(null)}
              disabled={procesandoConfirmacion}
            >
              Cancelar
            </Button>
            <Button
              variant={
                confirmacion?.tipo === "eliminar" ? "destructive" : "default"
              }
              size="sm"
              onClick={() => void confirmarAccion()}
              disabled={procesandoConfirmacion}
            >
              {procesandoConfirmacion && (
                <Loader2Icon className="animate-spin" />
              )}
              {confirmacion?.tipo === "eliminar" ? "Eliminar" : "Desconectar"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-white/60">
          {confirmacion?.instancia.nombre}
        </p>
      </Modal>
    </div>
  );
}
