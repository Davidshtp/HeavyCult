"use client";

import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import {
  actualizarIntegracion,
  conectarMetaAds,
  conectarShopify,
  crearIntegracion,
  type IntegracionInput,
} from "@/lib/dashboard-api";
import {
  PLATAFORMA_INTEGRACION_OPCIONES,
} from "@/lib/dashboard-mock";
import type { Integracion, PlataformaIntegracion } from "@/lib/types";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Modal } from "@/components/dashboard/modal";

interface Formulario {
  plataforma: PlataformaIntegracion;
  etiqueta: string;
  api_key: string;
  shopify_tienda: string;
  shopify_client_id: string;
  shopify_client_secret: string;
  meta_app_id: string;
  meta_app_secret: string;
  meta_access_token: string;
  meta_ad_account_id: string;
}

const FORMULARIO_VACIO: Formulario = {
  plataforma: "META_ADS",
  etiqueta: "",
  api_key: "",
  shopify_tienda: "",
  shopify_client_id: "",
  shopify_client_secret: "",
  meta_app_id: "",
  meta_app_secret: "",
  meta_access_token: "",
  meta_ad_account_id: "",
};

const labelCls =
  "text-[0.8rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase";

export function IntegracionFormModal({
  open,
  conexion,
  plataformasConectadas = [],
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  conexion: Integracion | null;
  plataformasConectadas?: PlataformaIntegracion[];
  onOpenChange: (abierto: boolean) => void;
  onSaved: (input: IntegracionInput) => void;
}) {
  const esEdicion = conexion !== null;
  const formId = useId();
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState<Formulario>(FORMULARIO_VACIO);

  const plataformasDisponibles = esEdicion
    ? PLATAFORMA_INTEGRACION_OPCIONES
    : PLATAFORMA_INTEGRACION_OPCIONES.filter(
        ([valor]) => !plataformasConectadas.includes(valor),
      );

  useEffect(() => {
    if (!open) return;
    setForm({
      ...FORMULARIO_VACIO,
      // El App ID y la cuenta de anuncios no son secretos, así que se pueden
      // rehidratar al editar. Los otros dos nunca se devuelven al cliente.
      meta_app_id: conexion?.config?.app_id ?? "",
      meta_ad_account_id: conexion?.config?.ad_account_id ?? "",
      ...(conexion
        ? { plataforma: conexion.plataforma, etiqueta: conexion.etiqueta }
        : { plataforma: plataformasDisponibles[0]?.[0] ?? "META_ADS" }),
    });
  }, [open, conexion]); // eslint-disable-line react-hooks/exhaustive-deps

  const esShopify = form.plataforma === "SHOPIFY";
  const esMetaAds = form.plataforma === "META_ADS";
  const conectandoDirecto = esShopify || esMetaAds;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    try {
      if (esShopify) {
        try {
          const { ok, mensaje } = await conectarShopify({
            shop: form.shopify_tienda,
            client_id: form.shopify_client_id,
            client_secret: form.shopify_client_secret,
          });
          toast[ok ? "success" : "error"](mensaje);
          onSaved({
            plataforma: "SHOPIFY",
            etiqueta: `Shopify (${form.shopify_tienda})`,
            api_key: "",
          });
          onOpenChange(false);
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "No se pudo conectar con Shopify.",
          );
        }
        return;
      }

      if (esMetaAds) {
        try {
          const { ok, mensaje } = await conectarMetaAds({
            app_id: form.meta_app_id.trim(),
            app_secret: form.meta_app_secret,
            access_token: form.meta_access_token.trim(),
            ad_account_id: form.meta_ad_account_id.trim(),
          });
          toast[ok ? "success" : "error"](mensaje);
          onSaved({
            plataforma: "META_ADS",
            etiqueta: esEdicion
              ? conexion?.etiqueta ?? ""
              : `Meta Ads (${form.meta_ad_account_id.trim()})`,
            api_key: "",
          });
          onOpenChange(false);
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "No se pudo conectar con Meta Ads.",
          );
        }
        return;
      }

      const input: IntegracionInput = {
        plataforma: form.plataforma,
        etiqueta: form.etiqueta.trim(),
        api_key: form.api_key,
      };
      if (esEdicion && conexion) {
        await actualizarIntegracion(conexion.id_integracion, {
          etiqueta: input.etiqueta,
          api_key: input.api_key,
        });
        toast.success("Conexión actualizada correctamente.");
      } else {
        await crearIntegracion(input);
        toast.success("Conexión agregada correctamente.");
      }
      onSaved(input);
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo guardar la conexión.",
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={esEdicion ? "Editar conexión" : "Agregar conexión"}
      description="Las claves se almacenan de forma segura y solo se muestran enmascaradas."
      footer={
        <>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form={formId}
            disabled={guardando || (!esEdicion && plataformasDisponibles.length === 0)}
            className="bg-linear-to-r from-brand-600 to-violet-600 hover:from-brand-600 hover:to-violet-600 hover:opacity-90"
          >
            {guardando
              ? conectandoDirecto
                ? "Conectando…"
                : "Guardando…"
              : esEdicion
                ? "Guardar cambios"
                : esShopify
                  ? "Conectar con Shopify"
                  : esMetaAds
                    ? "Conectar con Meta Ads"
                    : "Agregar conexión"}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={enviar} className="grid gap-4">
        <div className="grid gap-2">
          {!esEdicion && plataformasDisponibles.length === 0 ? (
            <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-4 text-sm text-muted-foreground">
              Ya tienes conexiones para todas las plataformas disponibles.
            </p>
        ) : (
            <>
              <Label htmlFor="co-plataforma" className={labelCls}>
                Plataforma
              </Label>
              <Select
                value={form.plataforma}
                items={Object.fromEntries(plataformasDisponibles)}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, plataforma: v as PlataformaIntegracion }))
                }
              >
                <SelectTrigger id="co-plataforma" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {plataformasDisponibles.map(([valor, etiqueta]) => (
                    <SelectItem key={valor} value={valor}>
                      {etiqueta}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>

        {esShopify ? (
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="co-shop-tienda" className={labelCls}>
                Dominio de la tienda
              </Label>
              <Input
                id="co-shop-tienda"
                value={form.shopify_tienda}
                onChange={(e) =>
                  setForm((f) => ({ ...f, shopify_tienda: e.target.value }))
                }
                required
                placeholder="heavycult.myshopify.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="co-shop-client-id" className={labelCls}>
                Client ID (API key)
              </Label>
              <Input
                id="co-shop-client-id"
                value={form.shopify_client_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, shopify_client_id: e.target.value }))
                }
                required
                placeholder="32 caracteres hexadecimales"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="co-shop-client-secret" className={labelCls}>
                Client Secret
              </Label>
              <Input
                id="co-shop-client-secret"
                type="password"
                autoComplete="off"
                value={form.shopify_client_secret}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    shopify_client_secret: e.target.value,
                  }))
                }
                required
                placeholder="shpss_…"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Al conectar, el backend obtiene el token automáticamente (Client
              Credentials), lo guarda cifrado junto con las credenciales de la
              tienda y prueba la conexión. Los tokens expiran a las 24 h y se
              renuevan solos.
            </p>
          </div>
        ) : esMetaAds ? (
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="co-meta-app-id" className={labelCls}>
                App ID
              </Label>
              <Input
                id="co-meta-app-id"
                value={form.meta_app_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, meta_app_id: e.target.value }))
                }
                required
                inputMode="numeric"
                placeholder="1080296201298518"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="co-meta-ad-account" className={labelCls}>
                Cuenta de anuncios
              </Label>
              <Input
                id="co-meta-ad-account"
                value={form.meta_ad_account_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, meta_ad_account_id: e.target.value }))
                }
                required
                placeholder="act_447628080460920"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="co-meta-app-secret" className={labelCls}>
                App Secret
              </Label>
              <PasswordInput
                id="co-meta-app-secret"
                autoComplete="off"
                value={form.meta_app_secret}
                onChange={(e) =>
                  setForm((f) => ({ ...f, meta_app_secret: e.target.value }))
                }
                required={!esEdicion}
                placeholder={esEdicion ? "Deja vacío para conservar el actual" : "••••••••"}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="co-meta-access-token" className={labelCls}>
                Access Token
              </Label>
              <PasswordInput
                id="co-meta-access-token"
                autoComplete="off"
                value={form.meta_access_token}
                onChange={(e) =>
                  setForm((f) => ({ ...f, meta_access_token: e.target.value }))
                }
                required={!esEdicion}
                placeholder={esEdicion ? "Deja vacío para conservar el actual" : "EAA…"}
              />
              {esEdicion && conexion && (
                <p className="text-sm text-muted-foreground">
                  Token actual:{" "}
                  <span className="font-mono text-brand-300/80">
                    {conexion.api_key_enmascarada}
                  </span>
                </p>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              El App Secret y el Access Token se cifran antes de guardarse y
              nunca se vuelven a mostrar. Al conectar se valida que el token
              pertenezca a esta app y que tenga acceso a la cuenta de anuncios.
              Los tokens de Meta no se renuevan solos: si Meta los revoca,
              genera uno nuevo en el Events Manager y vuelve a guardar.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-2">
              <Label htmlFor="co-etiqueta" className={labelCls}>
                Nombre / etiqueta
              </Label>
              <Input
                id="co-etiqueta"
                value={form.etiqueta}
                onChange={(e) =>
                  setForm((f) => ({ ...f, etiqueta: e.target.value }))
                }
                required
                placeholder="Cuenta principal · ad account 01"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="co-key" className={labelCls}>
                API key
              </Label>
              <Input
                id="co-key"
                type="password"
                autoComplete="off"
                value={form.api_key}
                onChange={(e) =>
                  setForm((f) => ({ ...f, api_key: e.target.value }))
                }
                required={!esEdicion}
                placeholder={
              esEdicion
                ? "Deja vacío para conservar la actual"
                : "sk-…"
            }
              />
              {esEdicion && (
                <p className="text-sm text-muted-foreground">
                  Clave actual:{" "}
                  <span className="font-mono text-brand-300/80">
                    {conexion?.api_key_enmascarada}
                  </span>
                </p>
              )}
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}