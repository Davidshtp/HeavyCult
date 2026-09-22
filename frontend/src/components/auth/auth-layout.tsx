import type { ReactNode } from "react";
import { EcosystemConstellation } from "@/components/branding/ecosystem-constellation";
import { BrandMark } from "@/components/branding/brand-mark";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden bg-linear-to-b from-[#150a2e] via-[#130a28] to-[#0c061d] lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div className="absolute inset-0 bg-grid opacity-20" aria-hidden />
      <div className="absolute inset-0" aria-hidden>
        <div className="absolute -left-24 -top-32 size-128 rounded-full bg-brand-600/25 blur-3xl animate-drift" />
        <div className="absolute -right-32 top-1/3 size-144 rounded-full bg-violet-500/20 blur-3xl animate-drift-delayed" />
        <div className="absolute -bottom-40 left-1/4 size-120 rounded-full bg-fuchsia-500/18 blur-3xl animate-drift-slow" />
        <div className="absolute left-1/2 top-1/4 size-96 rounded-full bg-violet-400/15 blur-3xl animate-drift-delayed" />
        <div className="absolute left-1/5 top-1/2 size-104 rounded-full bg-brand-500/18 blur-3xl animate-drift" />
        <div className="absolute bottom-10 right-1/4 size-80 rounded-full bg-fuchsia-400/10 blur-2xl ring-1 ring-white/10 animate-drift-slow" />
      </div>

      <EcosystemConstellation />

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center p-4 sm:p-8 lg:border-l lg:border-white/10 lg:bg-black/25 lg:backdrop-blur-md">
        <div className="relative w-full max-w-xl">
          <div className="mb-8 flex flex-col items-center gap-2 lg:hidden animate-in fade-in duration-500">
            <BrandMark className="size-12" />
            <p className="font-heading text-xl font-semibold text-white">
              HeavyCult
            </p>
            <p className="max-w-xs text-center text-xs text-white/60">
              Tecnología que conecta tus campañas, ventas y pedidos en un solo
              lugar.
            </p>
          </div>

          <div
            className="pointer-events-none absolute left-1/2 top-1/2 size-168 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.12),transparent_65%)]"
            aria-hidden
          />

          <div className="relative">{children}</div>
        </div>
      </main>

      <div
        className="pointer-events-none absolute inset-0 z-20 bg-noise opacity-[0.11] mix-blend-overlay"
        aria-hidden
      />
    </div>
  );
}