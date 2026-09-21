"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Recuperar contraseña</CardTitle>
          <CardDescription>
            Ingresa tu correo y te enviaremos un enlace para restablecerla.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent>
            <div className="grid gap-2">
              <Label htmlFor="correo">Correo</Label>
              <Input
                id="correo"
                type="email"
                autoComplete="email"
                placeholder="tucorreo@heavycult.co"
                aria-invalid={!!errors.correo}
                {...register("correo")}
              />
              {errors.correo && (
                <p className="text-sm text-destructive">{errors.correo.message}</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Enviando…" : "Enviar enlace"}
            </Button>
            <p className="text-sm text-muted-foreground">
              ¿Recordaste tu contraseña?{" "}
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