"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { LockKeyhole, Mail } from "lucide-react";
import { AnimatedLock } from "@/components/auth/animated-lock";
import { AuthCard } from "@/components/auth/auth-card";
import { PasswordInput } from "@/components/auth/password-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiClientError, apiRequest } from "@/lib/api";
import { loginSchema, type LoginValues } from "@/lib/schemas";
import type { LoginResponse } from "@/lib/types";

export function LoginForm({ onForgot }: { onForgot?: () => void }) {
  const router = useRouter();
  const [unlocked, setUnlocked] = useState(false);
  const [shakeCount, setShakeCount] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginValues) {
    try {
      await apiRequest<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setUnlocked(true);
    } catch (error) {
      if (error instanceof ApiClientError && error.statusCode === 403) {
        toast.dismiss();
        toast.error(error.message, { id: `bloqueo-${Date.now()}` });
      }
      setShakeCount((c) => c + 1);
    }
  }

  function enterDashboard() {
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthCard
      icon={
        <AnimatedLock
          unlocked={unlocked}
          shake={shakeCount}
          onComplete={enterDashboard}
          className="mx-auto"
        />
      }
      title="Bienvenido de nuevo"
      subtitle="Ingresa tus credenciales para acceder a tu panel de control."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <div className="grid gap-2">
          <Label htmlFor="correo" className="text-[0.85rem] font-medium uppercase tracking-[0.16em] text-white/40">
            Correo electrónico
          </Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/35" />
            <Input
              id="correo"
              type="email"
              autoComplete="email"
              placeholder="tucorreo@heavycult.co"
              className="pl-10"
              aria-invalid={!!errors.correo}
              {...register("correo")}
            />
          </div>
          {errors.correo && (
            <p className="text-base font-medium text-brand-300">
              {errors.correo.message}
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="contrasena" className="text-[0.85rem] font-medium uppercase tracking-[0.16em] text-white/40">
              Contraseña
            </Label>
            <button
              type="button"
              tabIndex={-1}
              onClick={onForgot}
              className="text-base font-medium text-brand-300 transition-colors hover:text-brand-200"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/35" />
            <PasswordInput
              id="contrasena"
              autoComplete="current-password"
              placeholder="********"
              className="pl-10"
              aria-invalid={!!errors.contrasena}
              {...register("contrasena")}
            />
          </div>
          {errors.contrasena && (
            <p className="text-base font-medium text-brand-300">
              {errors.contrasena.message}
            </p>
          )}
        </div>

        <SubmitButton loading={isSubmitting} loadingLabel="Verificando…">
          Iniciar sesión
        </SubmitButton>

        <p className="text-center text-sm text-white/25">
          Acceso restringido a personal autorizado de HeavyCult.
        </p>
      </form>
    </AuthCard>
  );
}