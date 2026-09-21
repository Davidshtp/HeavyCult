"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
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
import { apiRequest } from "@/lib/api";
import { resetSchema, type ResetValues } from "@/lib/schemas";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
  });

  async function onSubmit(values: ResetValues) {
    try {
      const res = await apiRequest<{ message: string }>(
        `/auth/restablecer?token=${encodeURIComponent(token)}`,
        {
          method: "POST",
          body: JSON.stringify({
            codigo: values.codigo.toUpperCase(),
            nuevaContrasena: values.nuevaContrasena,
          }),
        },
      );
      toast.success(res.message);
      router.replace("/login");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al restablecer la contraseña.");
    }
  }

  if (!token) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Enlace inválido</CardTitle>
            <CardDescription>
              El enlace de recuperación no es válido o ya expiró. Solicita uno nuevo.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              render={<Link href="/forgot-password" />}
              variant="outline"
              className="w-full"
            >
              Solicitar nuevo enlace
            </Button>
          </CardFooter>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Restablecer contraseña</CardTitle>
          <CardDescription>
            Ingresa el código de 6 caracteres recibido por correo y tu nueva contraseña.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="codigo">Código</Label>
              <Input
                id="codigo"
                placeholder="ABCD12"
                autoComplete="off"
                className="font-mono uppercase"
                aria-invalid={!!errors.codigo}
                {...register("codigo")}
              />
              {errors.codigo && (
                <p className="text-sm text-destructive">{errors.codigo.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nuevaContrasena">Nueva contraseña</Label>
              <Input
                id="nuevaContrasena"
                type="password"
                autoComplete="new-password"
                aria-invalid={!!errors.nuevaContrasena}
                {...register("nuevaContrasena")}
              />
              {errors.nuevaContrasena && (
                <p className="text-sm text-destructive">
                  {errors.nuevaContrasena.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmar">Confirmar contraseña</Label>
              <Input
                id="confirmar"
                type="password"
                autoComplete="new-password"
                aria-invalid={!!errors.confirmar}
                {...register("confirmar")}
              />
              {errors.confirmar && (
                <p className="text-sm text-destructive">{errors.confirmar.message}</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Guardando…" : "Restablecer contraseña"}
            </Button>
            <p className="text-sm text-muted-foreground">
              <Link href="/login" className="text-primary underline-offset-4 hover:underline">
                Volver al inicio de sesión
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </main>
  );
}