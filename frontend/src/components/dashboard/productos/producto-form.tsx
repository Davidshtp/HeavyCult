"use client";

import { useEffect, useId, useState } from "react";
import { Loader2Icon, SearchIcon } from "lucide-react";
import { toast } from "sonner";
import {
  actualizarProducto,
  buscarProductoDropi,
  crearProducto,
  type ProductoInput,
} from "@/lib/dashboard-api";
import type { Producto } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/dashboard/modal";

interface Formulario {
  sku_dropi: string;
  nombre: string;
  descripcion: string;
  precio_venta: string;
  costo: string;
  stock: string;
  tallas: string;
  url_imagen: string;
}

const FORMULARIO_VACIO: Formulario = {
  sku_dropi: "",
  nombre: "",
  descripcion: "",
  precio_venta: "",
  costo: "",
  stock: "0",
  tallas: "",
  url_imagen: "",
};

export function ProductoFormModal({
  open,
  producto,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  producto: Producto | null;
  onOpenChange: (abierto: boolean) => void;
  onSaved?: (input: ProductoInput) => void;
}) {
  const formId = useId();
  const esEdicion = producto !== null;
  const [guardando, setGuardando] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [sincronizado, setSincronizado] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);
  const [form, setForm] = useState<Formulario>(FORMULARIO_VACIO);

  useEffect(() => {
    if (!open) return;
    setForm(
      producto
        ? {
            sku_dropi: producto.sku_dropi ?? "",
            nombre: producto.nombre,
            descripcion: producto.descripcion ?? "",
            precio_venta: String(producto.precio_venta),
            costo: String(producto.costo),
            stock: String(producto.stock),
            tallas: producto.tallas.join(", "),
            url_imagen: producto.url_imagen ?? "",
          }
        : FORMULARIO_VACIO,
    );
    setSincronizado(esEdicion);
    setErrorBusqueda(null);
    setBuscando(false);
  }, [open, producto, esEdicion]);

  function cambiar(campo: keyof Formulario, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function manejarSku(valor: string) {
    setForm((f) => ({ ...f, sku_dropi: valor }));
    setSincronizado(false);
    setErrorBusqueda(null);
  }

  async function buscar() {
    const sku = form.sku_dropi.trim();
    if (!sku) {
      toast.error("Ingresa el SKU de Dropi para buscar.");
      return;
    }
    if (buscando) return;
    setBuscando(true);
    setErrorBusqueda(null);
    try {
      const dropi = await buscarProductoDropi(sku);
      setForm((f) => ({
        ...f,
        nombre: dropi.nombre,
        descripcion: dropi.descripcion ?? "",
        precio_venta: String(dropi.precio_venta),
        costo: String(dropi.costo),
        stock: String(dropi.stock),
        tallas: dropi.tallas.join(", "),
        url_imagen: dropi.url_imagen ?? "",
      }));
      setSincronizado(true);
      toast.success(`Producto encontrado en Dropi: ${dropi.nombre}`);
    } catch (err) {
      setSincronizado(false);
      setErrorBusqueda(
        err instanceof Error
          ? err.message
          : "No se encontró el SKU en Dropi.",
      );
      toast.error("No se encontró el SKU en Dropi.");
    } finally {
      setBuscando(false);
    }
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!esEdicion && !sincronizado) {
      toast.error("Busca el SKU en Dropi antes de guardar.");
      return;
    }
    setGuardando(true);
    try {
      const input: ProductoInput = {
        sku_dropi: form.sku_dropi,
        nombre: form.nombre,
        descripcion: form.descripcion,
        precio_venta: Number(form.precio_venta) || 0,
        costo: Number(form.costo) || 0,
        stock: Math.max(0, Math.floor(Number(form.stock) || 0)),
        tallas: form.tallas
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        url_imagen: form.url_imagen,
      };
      if (esEdicion && producto) {
        await actualizarProducto(producto.id_producto, input);
        toast.success("Producto actualizado.");
      } else {
        await crearProducto(input);
        toast.success("Producto agregado al catálogo (maquetación).");
      }
      onSaved?.(input);
      onOpenChange(false);
    } finally {
      setGuardando(false);
    }
  }

  const label =
    "text-[0.8rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase";
  const skuBloqueado = esEdicion || sincronizado;
  const puedeGuardar = esEdicion || sincronizado;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={esEdicion ? "Editar producto" : "Agregar producto"}
      description={
        esEdicion
          ? "Registro sincronizado con Dropi. Edita lo que necesites."
          : "El SKU se busca en Dropi y trae toda la data del producto."
      }
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form={formId}
            disabled={guardando || !puedeGuardar}
            className="bg-linear-to-r from-brand-600 to-violet-600 hover:from-brand-600 hover:to-violet-600 hover:opacity-90"
          >
            {guardando
              ? "Guardando…"
              : esEdicion
                ? "Guardar cambios"
                : "Agregar producto"}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={enviar} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="prod-sku" className={label}>
            SKU Dropi {esEdicion ? "" : "*"}
          </Label>
          <div className="flex items-start gap-2">
            <Input
              id="prod-sku"
              value={form.sku_dropi}
              onChange={(e) => manejarSku(e.target.value)}
              disabled={skuBloqueado}
              required={!esEdicion}
              placeholder="DP-HC-000"
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={buscar}
              disabled={buscando || (!esEdicion && sincronizado)}
            >
              {buscando ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <SearchIcon className="size-4" />
              )}
              {buscando
                ? "Buscando…"
                : esEdicion
                  ? "Actualizar desde Dropi"
                  : "Buscar en Dropi"}
            </Button>
          </div>
          {sincronizado && !errorBusqueda && (
            <p className="flex items-center gap-1.5 text-sm text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              {esEdicion
                ? "SKU sincronizado con Dropi"
                : "SKU verificado en Dropi · campos autocompletados"}
            </p>
          )}
          {errorBusqueda && (
            <p className="text-sm text-destructive">{errorBusqueda}</p>
          )}
          {!esEdicion && !sincronizado && !errorBusqueda && (
            <p className="text-sm text-muted-foreground">
              Busca el SKU para autocompletar los datos del producto.
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="prod-nombre" className={label}>
            Nombre
          </Label>
          <Input
            id="prod-nombre"
            value={form.nombre}
            onChange={(e) => cambiar("nombre", e.target.value)}
            required
            minLength={2}
            placeholder="Producto 'Nuevo Lanzamiento'"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="prod-desc" className={label}>
            Descripción
          </Label>
          <textarea
            id="prod-desc"
            rows={3}
            value={form.descripcion}
            onChange={(e) => cambiar("descripcion", e.target.value)}
            placeholder="Detalles de producto, materiales, cuidados…"
            className="min-h-20 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-base text-foreground outline-none placeholder:text-white/30 focus-visible:border-brand-400/60 focus-visible:ring-[3px] focus-visible:ring-brand-500/25"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="prod-precio" className={label}>
              Precio venta (COP)
            </Label>
            <Input
              id="prod-precio"
              type="number"
              min={0}
              step="1"
              value={form.precio_venta}
              onChange={(e) => cambiar("precio_venta", e.target.value)}
              required
              placeholder="49900"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="prod-costo" className={label}>
              Costo (COP)
            </Label>
            <Input
              id="prod-costo"
              type="number"
              min={0}
              step="1"
              value={form.costo}
              onChange={(e) => cambiar("costo", e.target.value)}
              required
              placeholder="21800"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="prod-stock" className={label}>
              Stock
            </Label>
            <Input
              id="prod-stock"
              type="number"
              min={0}
              step="1"
              value={form.stock}
              onChange={(e) => cambiar("stock", e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="prod-tallas" className={label}>
            Tallas / variantes
          </Label>
          <Input
            id="prod-tallas"
            value={form.tallas}
            onChange={(e) => cambiar("tallas", e.target.value)}
            placeholder="S, M, L, XL"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="prod-img" className={label}>
            URL de imagen (opcional)
          </Label>
          <Input
            id="prod-img"
            type="url"
            value={form.url_imagen}
            onChange={(e) => cambiar("url_imagen", e.target.value)}
            placeholder="https://…"
          />
        </div>
      </form>
    </Modal>
  );
}