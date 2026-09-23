"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ArrowLeft, Mail } from "lucide-react";
import { Lottie } from "lottie-react";
import { AuthCard } from "@/components/auth/auth-card";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api";
import { forgotSchema, type ForgotValues } from "@/lib/schemas";

export function ForgotPasswordForm({
  onSuccess,
  onBack,
  className,
}: {
  onSuccess?: () => void;
  onBack?: () => void;
  className?: string;
}) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
  });

  async function onSubmit(values: ForgotValues) {
    try {
      const res = await apiRequest<{ message: string }>("/auth/recuperar", {
        method: "POST",
        body: JSON.stringify(values),
      });
      toast.success(res.message);
      if (onSuccess) {
        onSuccess();
      } else {
        router.replace("/login");
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Error al enviar la solicitud.",
      );
    }
  }

  return (
    <AuthCard
      className={className}
      icon={
        <Lottie
          src="/animations/stack-animation.json"
          loop
          autoplay
          className="mx-auto"
          style={{ width: 104, height: 104 }}
        />
      }
      title="Recuperar contraseña"
      subtitle="Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <div className="grid gap-2">
          <Label htmlFor="correo" className="text-[0.7rem] font-medium uppercase tracking-[0.16em] text-white/40">
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
            <p className="text-sm font-medium text-brand-300">
              {errors.correo.message}
            </p>
          )}
        </div>

        <SubmitButton loading={isSubmitting} loadingLabel="Enviando…">
          Enviar enlace
        </SubmitButton>

        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="mx-auto flex items-center gap-1.5 text-sm font-medium text-white/45 transition-colors hover:text-white"
          >
            <ArrowLeft className="size-3.5" />
            Volver al inicio de sesión
          </button>
        ) : (
          <Link
            href="/login"
            className="mx-auto flex items-center gap-1.5 text-sm font-medium text-white/45 transition-colors hover:text-white"
          >
            <ArrowLeft className="size-3.5" />
            Volver al inicio de sesión
          </Link>
        )}
      </form>
    </AuthCard>
  );
}