"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogOutIcon, UsersIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";
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

const ESTADOS: EstadoUsuario[] = ["ACTIVO", "INACTIVO", "BLOQUEADO"];
const ROLES: RolUsuario[] = ["ADMIN", "EMPLEADO"];

function formatFecha(fecha?: string | null): string {
  if (!fecha) return "—";
  return new Date(fecha).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
}

function estadoVar(estado: EstadoUsuario): string {
  switch (estado) {
    case "ACTIVO":
      return "bg-emerald-100 text-emerald-700";
    case "INACTIVO":
      return "bg-muted text-muted-foreground";
    case "BLOQUEADO":
      return "bg-destructive/10 text-destructive";
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    correo: "",
    contrasena: "",
    telefono: "",
    rol: "EMPLEADO" as RolUsuario,
  });
  const [creando, setCreando] = useState(false);

  async function loadPerfil() {
    try {
      const perfil = await apiRequest<Usuario>("/auth/perfil");
      setUsuario(perfil);
      if (perfil.rol === "ADMIN") {
        const lista = await apiRequest<Usuario[]>("/users");
        setUsuarios(lista);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sesión inválida.");
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPerfil();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cerrarSesion() {
    await apiRequest("/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  async function cambiarEstado(id: number, estado: EstadoUsuario) {
    try {
      await apiRequest(`/users/${id}/estado`, {
        method: "PATCH",
        body: JSON.stringify({ estado }),
      });
      toast.success("Estado actualizado.");
      if (id === usuario?.id_usuario) {
        setUsuario({ ...usuario, estado });
      }
      setUsuarios((prev) => prev.map((u) => (u.id_usuario === id ? { ...u, estado } : u)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar el estado.");
    }
  }

  async function crearUsuario(e: React.FormEvent) {
    e.preventDefault();
    setCreando(true);
    try {
      const res = await apiRequest<{ message: string }>("/users", {
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
      toast.success(res.message);
      setForm({ nombre: "", apellido: "", correo: "", contrasena: "", telefono: "", rol: "EMPLEADO" });
      const lista = await apiRequest<Usuario[]>("/users");
      setUsuarios(lista);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al crear el usuario.");
    } finally {
      setCreando(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="mt-6 h-32 w-full" />
      </main>
    );
  }

  if (!usuario) return null;

  return (
    <main className="min-h-svh bg-muted/40">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between p-4">
          <div>
            <p className="font-heading text-lg font-medium">HeavyCult</p>
            <p className="text-xs text-muted-foreground">Sistema ERP</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium">
                {usuario.nombre} {usuario.apellido}
              </p>
              <p className="text-xs text-muted-foreground">{usuario.correo}</p>
            </div>
            <Badge className={estadoVar(usuario.estado)}>{usuario.estado}</Badge>
            <Button variant="outline" size="sm" onClick={cerrarSesion}>
              <LogOutIcon className="size-4" />
              Cerrar sesión
            </Button>
          </div>
        </div>
        <Separator />
      </header>

      <div className="mx-auto max-w-5xl space-y-6 p-4">
        <Card>
          <CardHeader>
            <CardTitle>Bienvenido, {usuario.nombre} 👋</CardTitle>
            <CardDescription>
              Último acceso: {formatFecha(usuario.ultimo_acceso)}
            </CardDescription>
          </CardHeader>
        </Card>

        {usuario.rol === "ADMIN" && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UsersIcon className="size-4" />
                  Nuevo usuario
                </CardTitle>
                <CardDescription>
                  Los usuarios de la plataforma se crean únicamente desde aquí.
                </CardDescription>
              </CardHeader>
              <form onSubmit={crearUsuario}>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="nombre">Nombre</Label>
                    <Input
                      id="nombre"
                      value={form.nombre}
                      onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                      required
                      minLength={2}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="apellido">Apellido</Label>
                    <Input
                      id="apellido"
                      value={form.apellido}
                      onChange={(e) => setForm((f) => ({ ...f, apellido: e.target.value }))}
                      required
                      minLength={2}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="correo">Correo</Label>
                    <Input
                      id="correo"
                      type="email"
                      value={form.correo}
                      onChange={(e) => setForm((f) => ({ ...f, correo: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="contrasena">Contraseña inicial</Label>
                    <Input
                      id="contrasena"
                      type="password"
                      autoComplete="new-password"
                      value={form.contrasena}
                      onChange={(e) => setForm((f) => ({ ...f, contrasena: e.target.value }))}
                      required
                      minLength={8}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="telefono">Teléfono (opcional)</Label>
                    <Input
                      id="telefono"
                      value={form.telefono}
                      onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="rol">Rol</Label>
                    <Select
                      value={form.rol}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, rol: v as RolUsuario }))
                      }
                    >
                      <SelectTrigger id="rol" className="w-full">
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
                  <Button type="submit" disabled={creando}>
                    {creando ? "Creando…" : "Crear usuario"}
                  </Button>
                </CardFooter>
              </form>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Usuarios</CardTitle>
                <CardDescription>
                  {usuarios.length} usuario(s) registrados.
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
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usuarios.map((u) => (
                      <TableRow key={u.id_usuario}>
                        <TableCell>
                          {u.nombre} {u.apellido}
                        </TableCell>
                        <TableCell>{u.correo}</TableCell>
                        <TableCell>
                          <Badge variant={u.rol === "ADMIN" ? "default" : "outline"}>
                            {u.rol}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={estadoVar(u.estado)}>{u.estado}</Badge>
                        </TableCell>
                        <TableCell>{formatFecha(u.ultimo_acceso)}</TableCell>
                        <TableCell>
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
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </main>
  );
}