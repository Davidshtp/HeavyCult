import type { ReactNode } from "react";
import { BrandMark } from "@/components/brand-mark";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div className="absolute inset-0 bg-grid opacity-[0.35]" aria-hidden />
      <div
        className="absolute -left-32 top-16 size-96 rounded-full bg-brand-400/15 blur-3xl animate-float"
        aria-hidden
      />
      <div
        className="absolute -bottom-32 -right-24 size-[28rem] rounded-full bg-violet-500/15 blur-3xl animate-float-delayed"
        aria-hidden
      />

      <div className="relative w-full max-w-md text-center animate-in fade-in duration-500">
        <BrandMark className="mx-auto size-14" />
        <p className="mt-4 font-heading text-3xl font-semibold tracking-tight">
          HeavyCult
        </p>
        <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
          Tecnología que conecta tus campañas, ventas y pedidos en un solo
          lugar.
        </p>

        <div className="mt-8">{children}</div>
      </div>

      <p className="absolute bottom-6 text-xs text-muted-foreground/70">
        © {new Date().getFullYear()} HeavyCult. Todos los derechos reservados.
      </p>
    </div>
  );
}