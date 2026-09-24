import type { ReactNode } from "react";
import { cn } from "cn";

export function AuthCard({
  icon,
  title,
  subtitle,
  children,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative w-full max-w-lg overflow-hidden rounded-[1.25rem] border border-white/10 bg-white/[0.03] px-9 py-11 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.8)] backdrop-blur-xl",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-brand-400/70 to-transparent" />
      <div
        className="pointer-events-none absolute -top-28 left-1/2 size-56 -translate-x-1/2 rounded-full bg-brand-600/20 blur-3xl"
        aria-hidden
      />

      <header className="mb-8 flex flex-col items-center gap-2 text-center">
        {icon ? <div className="mb-2 flex justify-center">{icon}</div> : null}
        <h1 className="font-heading text-[2rem] font-bold tracking-wide text-white">
          {title}
        </h1>
        {subtitle ? (
          <p className="max-w-sm text-base leading-relaxed text-white/45">
            {subtitle}
          </p>
        ) : null}
      </header>

      <div className="flex flex-col gap-6">{children}</div>
    </div>
  );
}