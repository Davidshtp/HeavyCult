"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ArrowLeft, Mail } from "lucide-react";
import { Lottie } from "lottie-react";
import { cn } from "cn";
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
      toast.error(error instanceof Error ? error.message : "Error al enviar la solicitud.");
    }
  }

  return (
    <Card
      className={cn(
        "w-full max-w-2xl border-border/60 bg-background/80 [--card-spacing:--spacing(7)] shadow-2xl shadow-brand-900/10 backdrop-blur-xl",
        className,
      )}
    >
      <CardHeader className="items-center text-center">
        <Lottie
          src="/animations/stack-animation.json"
          loop
          autoplay
          className="mx-auto"
          style={{ width: 116, height: 116 }}
        />
        <CardTitle className="font-heading text-3xl font-semibold">
          Recuperar contraseña
        </CardTitle>
        <CardDescription className="text-lg">
          Ingresa tu correo y te enviaremos un enlace para restablecerla.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent>
          <div className="grid gap-2">
            <Label htmlFor="correo" className="text-base">Correo</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="correo"
                type="email"
                autoComplete="email"
                placeholder="tucorreo@heavycult.co"
                className="h-11 pl-9"
                aria-invalid={!!errors.correo}
                {...register("correo")}
              />
            </div>
            {errors.correo && (
              <p className="text-sm text-violet-700">{errors.correo.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-3 border-transparent bg-transparent">
          <SubmitButton loading={isSubmitting} loadingLabel="Enviando…">
            Enviar enlace
          </SubmitButton>
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              <ArrowLeft className="size-3.5" />
              Volver al inicio de sesión
            </button>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              <ArrowLeft className="size-3.5" />
              Volver al inicio de sesión
            </Link>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}