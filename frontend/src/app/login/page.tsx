"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { LockKeyhole, Mail } from "lucide-react";
import { cn } from "cn";
import { AnimatedLock } from "@/components/auth/animated-lock";
import { AuthLayout } from "@/components/auth/auth-layout";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { PasswordInput } from "@/components/auth/password-input";
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
import { loginSchema, type LoginValues } from "@/lib/schemas";
import type { LoginResponse } from "@/lib/types";

export default function LoginPage() {
  const router = useRouter();
  const [flipped, setFlipped] = useState(false);
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
      const res = await apiRequest<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(values),
      });
      toast.success(res.message);
      setUnlocked(true);
    } catch (error) {
      setShakeCount((c) => c + 1);
      toast.error(error instanceof Error ? error.message : "Error al iniciar sesión.");
    }
  }

  function enterDashboard() {
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-2xl [perspective:1400px]">
        <div
          className={cn(
            "grid [transform-style:preserve-3d] transition-transform duration-700",
            flipped && "[transform:rotateY(180deg)]",
          )}
        >
          <div
            className="col-start-1 row-start-1 [backface-visibility:hidden] [transform:translateZ(0)]"
            aria-hidden={flipped}
          >
            <Card className="w-full max-w-2xl border-border/60 bg-background/80 [--card-spacing:--spacing(7)] shadow-2xl shadow-brand-900/10">
              <CardHeader className="items-center text-center">
                <AnimatedLock
                  unlocked={unlocked}
                  shake={shakeCount}
                  onComplete={enterDashboard}
                  className="mx-auto"
                />
                <CardTitle className="font-heading text-3xl font-semibold">
                  Iniciar sesión
                </CardTitle>
                <CardDescription className="text-lg">
                  Accede con tu cuenta corporativa de HeavyCult.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSubmit(onSubmit)}>
                <CardContent className="flex flex-col gap-4">
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
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="contrasena" className="text-base">Contraseña</Label>
                      <button
                        type="button"
                        onClick={() => setFlipped(true)}
                        className="text-sm text-brand-600 underline-offset-4 hover:underline dark:text-brand-400"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>
                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <PasswordInput
                        id="contrasena"
                        autoComplete="current-password"
                        placeholder="********"
                        className="h-11 pl-9"
                        aria-invalid={!!errors.contrasena}
                        {...register("contrasena")}
                      />
                    </div>
                    {errors.contrasena && (
                      <p className="text-sm text-violet-700">
                        {errors.contrasena.message}
                      </p>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex-col gap-3 border-transparent bg-transparent">
                  <SubmitButton loading={isSubmitting} loadingLabel="Entrando…">
                    Iniciar sesión
                  </SubmitButton>
                </CardFooter>
              </form>
            </Card>
          </div>
          <div
            className="col-start-1 row-start-1 [transform:rotateY(180deg)] [backface-visibility:hidden]"
            aria-hidden={!flipped}
          >
            <ForgotPasswordForm
              onBack={() => setFlipped(false)}
              onSuccess={() => setFlipped(false)}
            />
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}