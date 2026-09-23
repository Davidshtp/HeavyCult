"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ArrowLeft, KeyRound, ShieldAlert } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-card";
import { PasswordInput } from "@/components/auth/password-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiClientError, apiRequest } from "@/lib/api";
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
      toast.error(
        error instanceof ApiClientError && error.statusCode === 401
          ? "El enlace de recuperación ha expirado. Solicita uno nuevo."
          : error instanceof Error
            ? error.message
            : "Error al restablecer la contraseña.",
      );
    }
  }

  if (!token) {
    return (
      <AuthCard
        icon={<ShieldAlert className="mx-auto size-10 text-brand-300" />}
        title="Enlace inválido"
        subtitle="El enlace de recuperación no es válido o ya expiró. Solicita uno nuevo."
      >
        <Link
          href="/forgot-password"
          className="flex h-11 w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-sm font-medium text-white transition-colors hover:bg-white/10"
        >
          Solicitar nuevo enlace
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      icon={<KeyRound className="mx-auto size-10 text-brand-300" />}
      title="Restablecer contraseña"
      subtitle="Ingresa el código de 6 caracteres recibido por correo y tu nueva contraseña."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <div className="grid gap-2">
          <Label htmlFor="codigo" className="text-[0.7rem] font-medium uppercase tracking-[0.16em] text-white/40">
            Código de recuperación
          </Label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/35" />
            <Input
              id="codigo"
              placeholder="ABCD12"
              autoComplete="off"
              className="pl-10 font-mono uppercase tracking-widest"
              aria-invalid={!!errors.codigo}
              {...register("codigo")}
            />
          </div>
          {errors.codigo && (
            <p className="text-sm font-medium text-brand-300">
              {errors.codigo.message}
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="nuevaContrasena" className="text-[0.7rem] font-medium uppercase tracking-[0.16em] text-white/40">
            Nueva contraseña
          </Label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/35" />
            <PasswordInput
              id="nuevaContrasena"
              autoComplete="new-password"
              placeholder="••••••••"
              className="pl-10"
              aria-invalid={!!errors.nuevaContrasena}
              {...register("nuevaContrasena")}
            />
          </div>
          {errors.nuevaContrasena && (
            <p className="text-sm font-medium text-brand-300">
              {errors.nuevaContrasena.message}
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="confirmar" className="text-[0.7rem] font-medium uppercase tracking-[0.16em] text-white/40">
            Confirmar contraseña
          </Label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/35" />
            <PasswordInput
              id="confirmar"
              autoComplete="new-password"
              placeholder="••••••••"
              className="pl-10"
              aria-invalid={!!errors.confirmar}
              {...register("confirmar")}
            />
          </div>
          {errors.confirmar && (
            <p className="text-sm font-medium text-brand-300">
              {errors.confirmar.message}
            </p>
          )}
        </div>

        <SubmitButton loading={isSubmitting} loadingLabel="Guardando…">
          Restablecer contraseña
        </SubmitButton>

        <Link
          href="/login"
          className="mx-auto flex items-center gap-1.5 text-sm font-medium text-white/45 transition-colors hover:text-white"
        >
          <ArrowLeft className="size-3.5" />
          Volver al inicio de sesión
        </Link>
      </form>
    </AuthCard>
  );
}