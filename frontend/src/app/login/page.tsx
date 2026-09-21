"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, LockKeyhole, Mail } from "lucide-react";
import { AuthLayout } from "@/components/auth-layout";
import { PasswordInput } from "@/components/password-input";
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
import { loginSchema, type LoginValues } from "@/lib/schemas";
import type { LoginResponse } from "@/lib/types";

export default function LoginPage() {
  const router = useRouter();
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
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al iniciar sesión.");
    }
  }

  return (
    <AuthLayout>
      <Card className="w-full max-w-md border-border/60 bg-background/80 shadow-2xl shadow-brand-900/10 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-6 duration-500">
        <CardHeader className="items-center text-center">
          <CardTitle className="font-heading text-2xl font-semibold">
            Iniciar sesión
          </CardTitle>
          <CardDescription>
            Accede con tu cuenta corporativa de HeavyCult.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="correo">Correo</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="correo"
                  type="email"
                  autoComplete="email"
                  placeholder="tucorreo@heavycult.co"
                  className="h-10 pl-9"
                  aria-invalid={!!errors.correo}
                  {...register("correo")}
                />
              </div>
              {errors.correo && (
                <p className="text-sm text-destructive">{errors.correo.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="contrasena">Contraseña</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-brand-600 underline-offset-4 hover:underline dark:text-brand-400"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <PasswordInput
                  id="contrasena"
                  autoComplete="current-password"
                  className="pl-9"
                  aria-invalid={!!errors.contrasena}
                  {...register("contrasena")}
                />
              </div>
              {errors.contrasena && (
                <p className="text-sm text-destructive">
                  {errors.contrasena.message}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-3 border-transparent bg-transparent">
            <Button
              type="submit"
              className="h-10 w-full bg-gradient-to-r from-brand-600 to-violet-600 hover:from-brand-600 hover:to-violet-600 hover:opacity-90"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" />
                  Entrando…
                </>
              ) : (
                "Iniciar sesión"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </AuthLayout>
  );
}