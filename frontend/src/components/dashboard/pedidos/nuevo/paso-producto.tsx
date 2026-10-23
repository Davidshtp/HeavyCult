"use client";

import {
  Loader2Icon,
  MinusIcon,
  PackageSearchIcon,
  PlusIcon,
  SearchIcon,
  ShoppingCartIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";
import { cn } from "cn";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoneda } from "@/lib/format";
import type { Producto } from "@/lib/types";
import { EncabezadoPaso } from "./encabezado-paso";
import { etiquetaVariante, variantesConStock } from "./tipos";
import type { NuevoPedidoController } from "./use-nuevo-pedido";

export function PasoProducto({ pedido }: { pedido: NuevoPedidoController }) {
  const { producto, variante, cargandoProducto } = pedido;

  return (
    <section className="space-y-4">
      <EncabezadoPaso
        icono={ShoppingCartIcon}
        titulo="Producto"
        nota="Un pedido admite un solo producto. Podés ajustar la cantidad o la variante."
      />
      {cargandoProducto ? (
        <CargandoProducto />
      ) : producto ? (
        variante ? (
          <ProductoElegido pedido={pedido} />
        ) : (
          <ProductoSinVariantes pedido={pedido} />
        )
      ) : (
        <Buscador pedido={pedido} />
      )}
    </section>
  );
}

function Buscador({ pedido }: { pedido: NuevoPedidoController }) {
  const { consulta, setConsulta, resultados, buscando, seleccionarProducto } =
    pedido;
  const termino = consulta.trim();

  return (
    <div className="space-y-3">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/40" />
        <Input
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          placeholder="Buscar producto por nombre, SKU o proveedor…"
          aria-label="Buscar producto"
          className="h-12 pl-10"
        />
        {buscando && (
          <Loader2Icon className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-brand-300" />
        )}
      </div>

      {termino.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/10 bg-white/[0.015] px-4 py-10 text-center text-sm text-white/40">
          Buscá un producto para empezar el pedido.
        </p>
      ) : buscando && !resultados ? (
        <ListaSkeleton />
      ) : resultados && resultados.length > 0 ? (
        <ul className="space-y-2">
          {resultados.map((producto) => (
            <li key={producto.id_producto}>
              <BotonResultado
                producto={producto}
                onElegir={() => seleccionarProducto(producto)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-white/10 bg-white/[0.015] px-4 py-10 text-center text-sm text-white/45">
          Sin resultados para «{termino}».
        </p>
      )}
    </div>
  );
}

function BotonResultado({
  producto,
  onElegir,
}: {
  producto: Producto;
  onElegir: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onElegir}
      className="group flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-2.5 text-left transition hover:border-brand-500/40 hover:bg-white/[0.05]"
    >
      <Thumb producto={producto} className="size-11" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">
          {producto.titulo}
        </p>
        <p className="mt-0.5 font-mono text-[0.7rem] text-white/50">
          {rangoPrecio(producto)} · {producto.stock} und
        </p>
      </div>
      <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-white/60 transition group-hover:border-brand-400/50 group-hover:bg-brand-500/15 group-hover:text-brand-200">
        <PlusIcon className="size-4" />
      </span>
    </button>
  );
}

function ProductoElegido({ pedido }: { pedido: NuevoPedidoController }) {
  const {
    producto,
    idVariante,
    variante,
    cantidad,
    maxCantidad,
    precioUnitario,
    elegirVariante,
    cambiarCantidad,
    limpiarProducto,
  } = pedido;
  if (!producto || !variante) return null;

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
      <div className="flex items-start gap-3">
        <Thumb producto={producto} className="size-14" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">
            {producto.titulo}
          </p>
          <p className="mt-0.5 font-mono text-[0.7rem] text-white/45">
            {producto.stock} und disponibles
            {producto.es_dropi && " · Dropi"}
          </p>
        </div>
        <button
          type="button"
          onClick={limpiarProducto}
          className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs text-white/50 transition hover:bg-white/5 hover:text-white/80"
        >
          <XIcon className="size-3.5" /> Cambiar
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label className="mb-1.5 block text-sm text-white/70">Variante</Label>
          <Select
            value={idVariante}
            onValueChange={(valor) => elegirVariante(valor ?? "")}
          >
            <SelectTrigger className="h-11" aria-label="Elegir variante">
              <SelectValue placeholder="Elegí una variante">
                {(valor: string | null) => {
                  const elegida = producto.variantes.find(
                    (v) => v.id_variante === valor,
                  );
                  return elegida
                    ? `${etiquetaVariante(elegida)} · ${formatMoneda(elegida.precio)}`
                    : "Elegí una variante";
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {variantesConStock(producto).map((v) => {
                const agotada = v.stock <= 0;

                return (
                  <SelectItem
                    key={v.id_variante}
                    value={v.id_variante}
                    disabled={agotada}
                    className={agotada ? "data-disabled:opacity-100" : undefined}
                  >
                    <span
                      className={
                        agotada
                          ? "leading-snug break-words text-white/40"
                          : "leading-snug break-words text-white"
                      }
                    >
                      {etiquetaVariante(v)}
                    </span>
                    <span className="flex flex-wrap items-center gap-x-1.5 font-mono text-[0.7rem] text-white/45">
                      {formatMoneda(v.precio)}
                      <span className="text-white/20">·</span>
                      <span className={agotada ? "text-amber-300" : undefined}>
                        {agotada ? "Sin stock" : `${v.stock} und`}
                      </span>
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-1.5 block text-sm text-white/70">Cantidad</Label>
          <Stepper
            cantidad={cantidad}
            maxCantidad={maxCantidad}
            onChange={cambiarCantidad}
          />
          {variante.stock <= 0 && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-amber-300">
              <TriangleAlertIcon className="size-3.5" /> Esta variante no tiene
              stock.
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-brand-500/20 bg-brand-500/[0.06] px-3.5 py-2.5">
        <span className="text-xs text-white/60">Subtotal</span>
        <span className="font-mono text-sm font-semibold text-brand-200">
          {formatMoneda(precioUnitario * cantidad)}
        </span>
      </div>
    </div>
  );
}

function Stepper({
  cantidad,
  maxCantidad,
  onChange,
}: {
  cantidad: number;
  maxCantidad: number;
  onChange: (valor: number) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-xl border border-white/10 bg-white/[0.04]">
      <button
        type="button"
        onClick={() => onChange(cantidad - 1)}
        disabled={cantidad <= 1}
        aria-label="Quitar una unidad"
        className="grid size-10 place-items-center rounded-l-xl text-white/70 transition hover:bg-white/5 disabled:opacity-30"
      >
        <MinusIcon className="size-4" />
      </button>
      <input
        type="number"
        value={cantidad}
        min={1}
        max={maxCantidad}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Cantidad"
        className="w-14 bg-transparent text-center font-mono text-sm tabular-nums text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={() => onChange(cantidad + 1)}
        disabled={cantidad >= maxCantidad}
        aria-label="Agregar una unidad"
        className="grid size-10 place-items-center rounded-r-xl text-white/70 transition hover:bg-white/5 disabled:opacity-30"
      >
        <PlusIcon className="size-4" />
      </button>
    </div>
  );
}

function ProductoSinVariantes({ pedido }: { pedido: NuevoPedidoController }) {
  return (
    <div className="space-y-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-100">
      <p className="flex items-center gap-2">
        <TriangleAlertIcon className="size-4" /> Este producto no tiene
        variantes disponibles.
      </p>
      <button
        type="button"
        onClick={pedido.limpiarProducto}
        className="text-xs underline underline-offset-2"
      >
        Elegir otro producto
      </button>
    </div>
  );
}

function CargandoProducto() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <Loader2Icon className="size-4 animate-spin text-brand-300" />
      <span className="text-sm text-white/60">Cargando producto…</span>
    </div>
  );
}

function ListaSkeleton() {
  return (
    <ul className="space-y-2">
      {[0, 1, 2].map((indice) => (
        <li
          key={indice}
          className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-2.5"
        >
          <Skeleton className="size-11 rounded-xl" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-2/3 rounded" />
            <Skeleton className="h-3 w-1/3 rounded" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Thumb({
  producto,
  className,
}: {
  producto: Producto;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]",
        className,
      )}
    >
      {producto.url_imagen ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={producto.url_imagen}
          alt={producto.titulo}
          className="size-full object-cover"
        />
      ) : (
        <PackageSearchIcon className="size-4 text-white/40" />
      )}
    </span>
  );
}

function rangoPrecio(producto: Producto): string {
  return producto.precio_max > producto.precio_min
    ? `${formatMoneda(producto.precio_min)} – ${formatMoneda(producto.precio_max)}`
    : formatMoneda(producto.precio_min);
}
