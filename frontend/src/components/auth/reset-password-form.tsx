"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ArrowLeft, KeyRound, LockKeyhole } from "lucide-react";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
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
      <Card className="w-full max-w-xl border-border/60 bg-background/80 [--card-spacing:--spacing(6)] shadow-2xl shadow-brand-900/10 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-6 duration-500">
        <CardHeader className="items-center text-center">
          <CardTitle className="font-heading text-2xl font-semibold">
            Enlace inválido
          </CardTitle>
          <CardDescription className="text-base">
            El enlace de recuperación no es válido o ya expiró. Solicita uno
            nuevo.
          </CardDescription>
        </CardHeader>
        <CardFooter className="border-transparent bg-transparent">
          <Button
            render={<Link href="/forgot-password" />}
            variant="outline"
            className="h-11 w-full"
          >
            Solicitar nuevo enlace
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl border-border/60 bg-background/80 [--card-spacing:--spacing(7)] shadow-2xl shadow-brand-900/10 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-6 duration-500">
        <CardHeader className="items-center text-center">
          <CardTitle className="font-heading text-3xl font-semibold">
            Restablecer contraseña
          </CardTitle>
          <CardDescription className="text-lg">
            Ingresa el código de 6 caracteres recibido por correo y tu nueva
            contraseña.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="codigo" className="text-base">Código</Label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="codigo"
                  placeholder="ABCD12"
                  autoComplete="off"
                  className="h-11 pl-9 font-mono uppercase"
                  aria-invalid={!!errors.codigo}
                  {...register("codigo")}
                />
              </div>
              {errors.codigo && (
                <p className="text-sm text-violet-700">{errors.codigo.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nuevaContrasena" className="text-base">Nueva contraseña</Label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <PasswordInput
                  id="nuevaContrasena"
                  autoComplete="new-password"
                  className="h-11 pl-9"
                  aria-invalid={!!errors.nuevaContrasena}
                  {...register("nuevaContrasena")}
                />
              </div>
              {errors.nuevaContrasena && (
                <p className="text-sm text-violet-700">
                  {errors.nuevaContrasena.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmar" className="text-base">Confirmar contraseña</Label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <PasswordInput
                  id="confirmar"
                  autoComplete="new-password"
                  className="h-11 pl-9"
                  aria-invalid={!!errors.confirmar}
                  {...register("confirmar")}
                />
              </div>
              {errors.confirmar && (
                <p className="text-sm text-violet-700">
                  {errors.confirmar.message}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-3 border-transparent bg-transparent">
            <SubmitButton loading={isSubmitting} loadingLabel="Guardando…">
              Restablecer contraseña
            </SubmitButton>
            <Link
              href="/login"
              className="flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              <ArrowLeft className="size-3.5" />
              Volver al inicio de sesión
            </Link>
          </CardFooter>
        </form>
      </Card>
  );
}