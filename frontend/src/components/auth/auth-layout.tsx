import type { ReactNode } from "react";
import { AuthAbout } from "@/components/auth/auth-about";
import { AuthBackground } from "@/components/auth/auth-background";
import { AuthHeader } from "@/components/auth/auth-header";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      id="inicio"
      className="relative flex min-h-svh flex-col bg-background text-foreground"
    >
      <AuthBackground />

      <AuthHeader />

      <main
        id="ingresar"
        className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-12 scroll-mt-24 px-4 py-14 sm:px-6"
      >
        {children}
        <AuthAbout />
      </main>

      <footer id="soporte" className="relative z-10 scroll-mt-24 border-t border-white/10">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-1.5 px-4 py-6 sm:px-6">
          <p className="font-mono text-[0.85rem] font-medium uppercase tracking-[0.3em] text-white/30">
            ── HeavyCult v1.0 · ERP ──
          </p>
          <p className="font-mono text-sm text-white/25">
            soporte@heavycult.co
          </p>
        </div>
      </footer>
    </div>
  );
}