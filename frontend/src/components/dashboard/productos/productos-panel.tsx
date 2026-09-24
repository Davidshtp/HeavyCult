"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, PlusIcon, PencilIcon, RefreshCwIcon, SearchIcon, Trash2Icon } from "lucide-react";
import { EstadoBadge } from "@/components/dashboard/estado-badge";
import { SectionHeader } from "@/components/dashboard/section-header";
import { ProductoFormModal } from "@/components/dashboard/productos/producto-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  cambiarEstadoProducto,
  eliminarProducto,
  listarProductos,
  sincronizarDropi,
} from "@/lib/dashboard-api";
import type { EstadoProducto, Producto } from "@/lib/types";
import { formatMoneda, formatPorcentaje } from "@/lib/format";

type FiltroEstado = "TODOS" | EstadoProducto;

function codigoMargen(precio: number, costo: number): string {
  if (precio <= 0) return "text-muted-foreground";
  const margen = ((precio - costo) / precio) * 100;
  if (margen >= 50) return "text-emerald-300";
  if (margen >= 30) return "text-brand-300";
  return "text-amber-300";
}

function MiniProducto({ producto }: { producto: Producto }) {
  const [roto, setRoto] = useState(false);
  if (producto.url_imagen && !roto) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={producto.url_imagen}
        alt={producto.nombre}
        onError={() => setRoto(true)}
        className="size-10 shrink-0 rounded-lg border border-white/10 object-cover"
      />
    );
  }
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-brand-500/25 bg-brand-500/10 font-mono text-[0.75rem] font-semibold text-brand-300">
      {(producto.nombre.match(/[A-Za-z]/g) ?? ["?"]).slice(0, 2).join("").toUpperCase()}
    </span>
  );
}

export function ProductosPanel() {
  const [productos, setProductos] = useState<Producto[] | null>(null);
  const [buscando, setBuscando] = useState("");
  const [filtro, setFiltro] = useState<FiltroEstado>("TODOS");
  const [sincronizando, setSincronizando] = useState(false);
  const [modal, setModal] = useState<{ abierto: boolean; producto: Producto | null }>({
    abierto: false,
    producto: null,
  });

  async function cargar() {
    setProductos(await listarProductos());
  }

  useEffect(() => {
    cargar();
  }, []);

  const filtrados = (productos ?? []).filter((p) => {
    const coincideTexto =
      buscando === "" ||
      p.nombre.toLowerCase().includes(buscando.toLowerCase()) ||
      (p.sku_dropi ?? "").toLowerCase().includes(buscando.toLowerCase());
    const coincideEstado = filtro === "TODOS" || p.estado === filtro;
    return coincideTexto && coincideEstado;
  });

  async function manejarSync() {
    if (sincronizando) return;
    setSincronizando(true);
    try {
      await sincronizarDropi();
      setProductos(await listarProductos());
      toast.success("Catálogo sincronizado con Dropi (maquetación).");
    } finally {
      setSincronizando(false);
    }
  }

  async function manejarEstado(id: number, estado: EstadoProducto) {
    await cambiarEstadoProducto(id, estado);
    setProductos((prev) =>
      prev ? prev.map((p) => (p.id_producto === id ? { ...p, estado } : p)) : prev,
    );
    toast.success(estado === "ACTIVO" ? "Producto activado." : "Producto desactivado.");
  }

  async function manejarEliminar(producto: Producto) {
    if (!window.confirm(`¿Eliminar "${producto.nombre}" del catálogo?`)) return;
    await eliminarProducto(producto.id_producto);
    setProductos((prev) =>
      prev ? prev.filter((p) => p.id_producto !== producto.id_producto) : prev,
    );
    toast.success("Producto eliminado (maquetación).");
  }

  async function manejarGuardado() {
    setProductos(await listarProductos());
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Productos · Dropi"
        description={`${productos?.length ?? "—"} productos en catálogo · catálogo con datos de maquetación`}
        action={
          <Button
            variant="outline"
            onClick={manejarSync}
            disabled={sincronizando}
          >
            {sincronizando ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCwIcon className="size-4" />
            )}
            Sync Dropi
          </Button>
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={buscando}
              onChange={(e) => setBuscando(e.target.value)}
              placeholder="Buscar por nombre o SKU…"
              className="pl-9"
              aria-label="Buscar producto"
            />
          </div>
          <Select
            value={filtro}
            onValueChange={(v) => setFiltro(v as FiltroEstado)}
          >
            <SelectTrigger size="sm" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              <SelectItem value="ACTIVO">Activos</SelectItem>
              <SelectItem value="INACTIVO">Inactivos</SelectItem>
            </SelectContent>
          </Select>
          <Button
            className="sm:ml-auto bg-linear-to-r from-brand-600 to-violet-600 hover:from-brand-600 hover:to-violet-600 hover:opacity-90"
            onClick={() => setModal({ abierto: true, producto: null })}
          >
            <PlusIcon className="size-4" />
            Agregar producto
          </Button>
        </CardContent>
      </Card>

      <Card>
        {productos === null ? (
          <CardContent className="space-y-3 p-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        ) : filtrados.length === 0 ? (
          <CardContent className="py-12 text-center">
            <p className="text-base text-muted-foreground">
              No hay productos que coincidan con la búsqueda.
            </p>
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Precio venta</TableHead>
                <TableHead>Costo</TableHead>
                <TableHead>Margen</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Tallas</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((p) => (
                <TableRow key={p.id_producto}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <MiniProducto producto={p} />
                      <div>
                        <p className="max-w-52 truncate font-medium">{p.nombre}</p>
                        <p className="font-mono text-[0.75rem] text-muted-foreground">
                          {p.sku_dropi ?? "SIN SKU"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">{formatMoneda(p.precio_venta)}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">
                    {formatMoneda(p.costo)}
                  </TableCell>
                  <TableCell className={`font-mono ${codigoMargen(p.precio_venta, p.costo)}`}>
                    {formatPorcentaje(
                      p.precio_venta > 0
                        ? ((p.precio_venta - p.costo) / p.precio_venta) * 100
                        : 0,
                    )}
                  </TableCell>
                  <TableCell className={p.stock === 0 ? "text-amber-300" : ""}>
                    {p.stock}
                  </TableCell>
                  <TableCell className="font-mono text-[0.8rem] text-muted-foreground">
                    {p.tallas.join(" · ")}
                  </TableCell>
                  <TableCell>
                    <EstadoBadge estado={p.estado} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setModal({ abierto: true, producto: p })}
                        aria-label={`Editar ${p.nombre}`}
                      >
                        <PencilIcon className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => manejarEstado(p.id_producto, p.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO")}
                        aria-label={p.estado === "ACTIVO" ? "Desactivar producto" : "Activar producto"}
                      >
                        <span
                          className={`size-2 rounded-full ${p.estado === "ACTIVO" ? "bg-emerald-400" : "bg-muted-foreground"}`}
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => manejarEliminar(p)}
                        aria-label={`Eliminar ${p.nombre}`}
                      >
                        <Trash2Icon className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <ProductoFormModal
        open={modal.abierto}
        producto={modal.producto}
        onOpenChange={(abierto) =>
          setModal((m) => ({ ...m, abierto, producto: abierto ? m.producto : null }))
        }
        onSaved={manejarGuardado}
      />
    </div>
  );
}