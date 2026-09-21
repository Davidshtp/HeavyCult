"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { AuthLayout } from "@/components/auth-layout";
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
import { forgotSchema, type ForgotValues } from "@/lib/schemas";

export default function ForgotPasswordPage() {
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
      router.replace("/login");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al enviar la solicitud.");
    }
  }

  return (
    <AuthLayout>
      <Card className="w-full max-w-md border-border/60 bg-background/80 shadow-2xl shadow-brand-900/10 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-6 duration-500">
        <CardHeader className="items-center text-center">
          <CardTitle className="font-heading text-2xl font-semibold">
            Recuperar contraseña
          </CardTitle>
          <CardDescription>
            Ingresa tu correo y te enviaremos un enlace para restablecerla.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent>
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
                  Enviando…
                </>
              ) : (
                "Enviar enlace"
              )}
            </Button>
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
    </AuthLayout>
  );
}