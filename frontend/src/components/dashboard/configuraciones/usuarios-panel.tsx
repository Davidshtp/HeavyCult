"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { SearchIcon, Trash2Icon, UserCog, UserPlus, UsersIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { RolBadge } from "@/components/dashboard/rol-badge";
import { SectionHeader } from "@/components/dashboard/section-header";
import { usePerfil } from "@/components/dashboard/perfil-context";
import { Avatar } from "@/components/dashboard/avatar";
import { UsuarioFormModal } from "@/components/dashboard/configuraciones/usuario-form-modal";
import { UsuarioRolModal } from "@/components/dashboard/configuraciones/usuario-rol-modal";
import { UsuarioEliminarModal } from "@/components/dashboard/configuraciones/usuario-eliminar-modal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { apiRequest } from "@/lib/api";
import type { EstadoUsuario, RolUsuario, Usuario } from "@/lib/types";
import { formatTiempoRelativo } from "@/lib/format";

const ESTADOS: EstadoUsuario[] = ["ACTIVO", "INACTIVO", "BLOQUEADO"];

export function UsuariosPanel() {
  const router = useRouter();
  const { usuario } = usePerfil();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState<"TODOS" | RolUsuario>("TODOS");
  const [filtroEstado, setFiltroEstado] = useState<"TODOS" | EstadoUsuario>(
    "TODOS",
  );
  const [crearAbierto, setCrearAbierto] = useState(false);
  const [cambioRol, setCambioRol] = useState<{
    abierto: boolean;
    usuario: Usuario | null;
  }>({ abierto: false, usuario: null });
  const [eliminando, setEliminando] = useState<{
    abierto: boolean;
    usuario: Usuario | null;
  }>({ abierto: false, usuario: null });

  useEffect(() => {
    if (!usuario) return;
    (async () => {
      try {
        if (usuario.rol !== "ADMIN") {
          router.replace("/dashboard");
          return;
        }
        const lista = await apiRequest<Usuario[]>("/users");
        setUsuarios(lista);
      } catch {
        router.replace("/login");
      } finally {
        setCargando(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

  const stats = useMemo(
    () => [
      { etiqueta: "Total", valor: usuarios.length },
      {
        etiqueta: "Activos",
        valor: usuarios.filter((u) => u.estado === "ACTIVO").length,
      },
      {
        etiqueta: "Administradores",
        valor: usuarios.filter((u) => u.rol === "ADMIN").length,
      },
      {
        etiqueta: "Empleados",
        valor: usuarios.filter((u) => u.rol === "EMPLEADO").length,
      },
    ],
    [usuarios],
  );

  const usuariosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return usuarios.filter((u) => {
      const coincideTexto =
        !q ||
        `${u.nombre} ${u.apellido} ${u.correo}`.toLowerCase().includes(q);
      const coincideRol = filtroRol === "TODOS" || u.rol === filtroRol;
      const coincideEstado = filtroEstado === "TODOS" || u.estado === filtroEstado;
      return coincideTexto && coincideRol && coincideEstado;
    });
  }, [usuarios, busqueda, filtroRol, filtroEstado]);

  async function cambiarEstado(id: number, estado: EstadoUsuario) {
    try {
      await apiRequest(`/users/${id}/estado`, {
        method: "PATCH",
        body: JSON.stringify({ estado }),
      });
      setUsuarios((prev) =>
        prev.map((u) => (u.id_usuario === id ? { ...u, estado } : u)),
      );
      toast.success(`Estado actualizado a ${estado}.`);
    } catch {
      toast.error("No se pudo actualizar el estado.");
    }
  }

  function manejarCreacion(usuario: Usuario) {
    setUsuarios((prev) => [...prev, usuario]);
  }

  function manejarRolGuardado(actualizado: Usuario) {
    setUsuarios((prev) =>
      prev.map((u) => (u.id_usuario === actualizado.id_usuario ? actualizado : u)),
    );
  }

  function manejarEliminacion(id: number) {
    setUsuarios((prev) => prev.filter((u) => u.id_usuario !== id));
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Usuarios y roles"
        description="La gestión de usuarios se realiza únicamente desde este panel"
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.etiqueta}
            className="rounded-xl border border-white/10 bg-card/40 p-4"
          >
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-white/40">
              {stat.etiqueta}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              <span className="bg-linear-to-br from-brand-400 to-violet-500 bg-clip-text text-transparent">
                {stat.valor}
              </span>
            </p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="size-4 text-brand-600 dark:text-brand-400" />
              Usuarios registrados
            </CardTitle>
            <CardDescription>
              {usuarios.length} usuario(s) en la plataforma.
            </CardDescription>
          </div>
          <Button
            onClick={() => setCrearAbierto(true)}
            className="bg-linear-to-r from-brand-600 to-violet-600 hover:from-brand-600 hover:to-violet-600 hover:opacity-90"
          >
            <UserPlus className="size-4" />
            Nuevo usuario
          </Button>
        </CardHeader>

        {cargando ? (
          <CardContent className="space-y-3 p-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </CardContent>
        ) : (
          <>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="relative w-full md:max-w-64">
                  <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-white/40">
                    <SearchIcon className="size-4" />
                  </span>
                  <Input
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar por nombre o correo…"
                    className="pl-9"
                  />
                </div>
                <div className="flex flex-1 flex-wrap gap-2">
                  <Select
                    value={filtroRol}
                    onValueChange={(v) => setFiltroRol((v as RolUsuario) ?? "TODOS")}
                  >
                    <SelectTrigger size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TODOS">Todos los roles</SelectItem>
                      <SelectItem value="ADMIN">Administradores</SelectItem>
                      <SelectItem value="EMPLEADO">Empleados</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={filtroEstado}
                    onValueChange={(v) =>
                      setFiltroEstado((v as EstadoUsuario) ?? "TODOS")
                    }
                  >
                    <SelectTrigger size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TODOS">Todos los estados</SelectItem>
                      {ESTADOS.map((e) => (
                        <SelectItem key={e} value={e}>
                          {e}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {usuariosFiltrados.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <UsersIcon className="size-8 text-white/25" />
                  <p className="max-w-sm text-sm text-muted-foreground">
                    {usuarios.length === 0
                      ? "No hay usuarios registrados todavía. Crea el primero desde «Nuevo usuario»."
                      : "No hay usuarios que coincidan con la búsqueda o los filtros aplicados."}
                  </p>
                  {usuarios.length > 0 ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setBusqueda("");
                        setFiltroRol("TODOS");
                        setFiltroEstado("TODOS");
                      }}
                    >
                      Limpiar filtros
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setCrearAbierto(true)}
                      className="bg-linear-to-r from-brand-600 to-violet-600 hover:from-brand-600 hover:to-violet-600 hover:opacity-90"
                    >
                      <UserPlus className="size-4" />
                      Crear el primer usuario
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Correo</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Último acceso</TableHead>
                      <TableHead className="sticky right-0 bg-card text-right">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usuariosFiltrados.map((u) => {
                      const esPropio = u.id_usuario === usuario?.id_usuario;
                      return (
                        <TableRow key={u.id_usuario} className="group">
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <Avatar
                                nombre={u.nombre}
                                apellido={u.apellido}
                                urlImagen={u.url_imagen}
                              />
                              <span className="font-medium">
                                {u.nombre} {u.apellido}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[9rem] truncate">
                            {u.correo}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {u.telefono ?? "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <RolBadge rol={u.rol} />
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() =>
                                  setCambioRol({ abierto: true, usuario: u })
                                }
                                aria-label={`Cambiar rol de ${u.nombre} ${u.apellido}`}
                                title="Cambiar rol"
                              >
                                <UserCog className="size-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={u.estado}
                              onValueChange={(v) =>
                                cambiarEstado(u.id_usuario, v as EstadoUsuario)
                              }
                              disabled={esPropio}
                            >
                              <SelectTrigger className="w-24" size="sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ESTADOS.map((e) => (
                                  <SelectItem key={e} value={e}>
                                    {e}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {esPropio
                              ? "Ahora mismo"
                              : formatTiempoRelativo(u.ultimo_acceso)}
                          </TableCell>
                          <TableCell className="sticky right-0 bg-card pr-3 group-hover:bg-muted/50">
                            <div className="flex items-center justify-end">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() =>
                                  setEliminando({ abierto: true, usuario: u })
                                }
                                disabled={esPropio}
                                aria-label={`Eliminar ${u.nombre} ${u.apellido}`}
                                title={
                                  esPropio
                                    ? "No puedes eliminar tu propio usuario."
                                    : "Eliminar usuario"
                                }
                                className="text-destructive/80 hover:text-destructive"
                              >
                                <Trash2Icon className="size-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </>
        )}
      </Card>

      <UsuarioFormModal
        open={crearAbierto}
        onOpenChange={setCrearAbierto}
        onGuardado={manejarCreacion}
      />

      <UsuarioRolModal
        open={cambioRol.abierto}
        usuario={cambioRol.usuario}
        esPropio={cambioRol.usuario?.id_usuario === usuario?.id_usuario}
        onOpenChange={(abierto) =>
          setCambioRol((c) => ({
            abierto,
            usuario: abierto ? c.usuario : null,
          }))
        }
        onGuardado={manejarRolGuardado}
      />

      <UsuarioEliminarModal
        open={eliminando.abierto}
        usuario={eliminando.usuario}
        esPropio={eliminando.usuario?.id_usuario === usuario?.id_usuario}
        onOpenChange={(abierto) =>
          setEliminando((e) => ({
            abierto,
            usuario: abierto ? e.usuario : null,
          }))
        }
        onEliminado={manejarEliminacion}
      />
    </div>
  );
}