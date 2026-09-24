"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PencilIcon, UsersIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { RolBadge } from "@/components/dashboard/rol-badge";
import { EstadoBadge } from "@/components/dashboard/estado-badge";
import { SectionHeader } from "@/components/dashboard/section-header";
import { usePerfil } from "@/components/dashboard/perfil-context";
import { UsuarioEditFormModal } from "@/components/dashboard/configuraciones/usuario-edit-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import type { UsuarioEdicion } from "@/lib/dashboard-api";
import { formatFecha } from "@/lib/format";
import { iniciales } from "@/components/dashboard/avatar";

const ESTADOS: EstadoUsuario[] = ["ACTIVO", "INACTIVO", "BLOQUEADO"];
const ROLES: RolUsuario[] = ["ADMIN", "EMPLEADO"];

const labelCls =
  "text-[0.8rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase";

export function UsuariosPanel() {
  const router = useRouter();
  const { usuario } = usePerfil();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState<{ abierto: boolean; usuario: Usuario | null }>({
    abierto: false,
    usuario: null,
  });
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    correo: "",
    contrasena: "",
    telefono: "",
    rol: "EMPLEADO" as RolUsuario,
  });

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

  function cambiar(campo: keyof typeof form, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function crearUsuario(e: React.FormEvent) {
    e.preventDefault();
    setCreando(true);
    try {
      await apiRequest<{ message: string }>("/users", {
        method: "POST",
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          apellido: form.apellido.trim(),
          correo: form.correo.trim(),
          contrasena: form.contrasena,
          telefono: form.telefono.trim() || undefined,
          rol: form.rol,
        }),
      });
      setForm({ nombre: "", apellido: "", correo: "", contrasena: "", telefono: "", rol: "EMPLEADO" });
      setUsuarios(await apiRequest<Usuario[]>("/users"));
      toast.success("Usuario creado correctamente.");
    } catch {
      toast.error("No se pudo crear el usuario.");
    } finally {
      setCreando(false);
    }
  }

  async function cambiarEstado(id: number, estado: EstadoUsuario) {
    try {
      await apiRequest(`/users/${id}/estado`, {
        method: "PATCH",
        body: JSON.stringify({ estado }),
      });
      setUsuarios((prev) => prev.map((u) => (u.id_usuario === id ? { ...u, estado } : u)));
      toast.success(`Estado actualizado a ${estado}.`);
    } catch {
      toast.error("No se pudo actualizar el estado.");
    }
  }

  function manejarEdicionGuardada(id: number, campos: UsuarioEdicion) {
    setUsuarios((prev) =>
      prev.map((u) =>
        u.id_usuario === id
          ? { ...u, ...campos, telefono: campos.telefono ?? null }
          : u,
      ),
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Usuarios y roles"
        description="El alta de usuarios se realiza únicamente desde este panel"
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="size-4 text-brand-600 dark:text-brand-400" />
            Nuevo usuario
          </CardTitle>
          <CardDescription>
            El usuario recibirá las credenciales definidas aquí.
          </CardDescription>
        </CardHeader>
        <form onSubmit={crearUsuario}>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="nu-nombre" className={labelCls}>
                Nombre
              </Label>
              <Input
                id="nu-nombre"
                value={form.nombre}
                onChange={(e) => cambiar("nombre", e.target.value)}
                required
                minLength={2}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nu-apellido" className={labelCls}>
                Apellido
              </Label>
              <Input
                id="nu-apellido"
                value={form.apellido}
                onChange={(e) => cambiar("apellido", e.target.value)}
                required
                minLength={2}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nu-correo" className={labelCls}>
                Correo
              </Label>
              <Input
                id="nu-correo"
                type="email"
                value={form.correo}
                onChange={(e) => cambiar("correo", e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nu-contrasena" className={labelCls}>
                Contraseña inicial
              </Label>
              <Input
                id="nu-contrasena"
                type="password"
                autoComplete="new-password"
                value={form.contrasena}
                onChange={(e) => cambiar("contrasena", e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nu-telefono" className={labelCls}>
                Teléfono (opcional)
              </Label>
              <Input
                id="nu-telefono"
                value={form.telefono}
                onChange={(e) => cambiar("telefono", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nu-rol" className={labelCls}>
                Rol
              </Label>
              <Select
                value={form.rol}
                onValueChange={(v) => cambiar("rol", v ?? "")}
              >
                <SelectTrigger id="nu-rol" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((rol) => (
                    <SelectItem key={rol} value={rol}>
                      {rol === "ADMIN" ? "Administrador" : "Empleado"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              disabled={creando}
              className="bg-linear-to-r from-brand-600 to-violet-600 hover:from-brand-600 hover:to-violet-600 hover:opacity-90"
            >
              {creando ? "Creando…" : "Crear usuario"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        {cargando ? (
          <CardContent className="space-y-3 p-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </CardContent>
        ) : (
          <>
            <CardHeader>
              <CardTitle>Usuarios registrados</CardTitle>
              <CardDescription>
                {usuarios.length} usuario(s) en la plataforma.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Correo</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Último acceso</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios.map((u) => (
                    <TableRow key={u.id_usuario}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                            {iniciales(u.nombre, u.apellido)}
                          </span>
                          <span>
                            {u.nombre} {u.apellido}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{u.correo}</TableCell>
                      <TableCell>
                        <RolBadge rol={u.rol} />
                      </TableCell>
                      <TableCell>
                        <EstadoBadge estado={u.estado} />
                      </TableCell>
                      <TableCell>{formatFecha(u.ultimo_acceso)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Select
                            value={u.estado}
                            onValueChange={(v) =>
                              cambiarEstado(u.id_usuario, v as EstadoUsuario)
                            }
                          >
                            <SelectTrigger className="w-28" size="sm">
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
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() =>
                              setEditando({ abierto: true, usuario: u })
                            }
                            aria-label={`Editar ${u.nombre} ${u.apellido}`}
                          >
                            <PencilIcon className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </>
        )}
      </Card>

      <UsuarioEditFormModal
        open={editando.abierto}
        usuario={editando.usuario}
        onOpenChange={(abierto) =>
          setEditando((e) => ({ ...e, abierto, usuario: abierto ? e.usuario : null }))
        }
        onSaved={manejarEdicionGuardada}
      />
    </div>
  );
}