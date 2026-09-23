const SEGMENTS = [
  { label: "Inicio", href: "#inicio" },
  { label: "Información", href: "#informacion" },
  { label: "Soporte", href: "#soporte" },
];

export function AuthHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <a
          href="#inicio"
          className="flex items-center gap-2.5"
          aria-label="HeavyCult, inicio"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt=""
            className="size-7 rounded-[0.35rem]"
          />
          <span className="font-heading text-base font-bold tracking-[0.2em] text-white">
            Heavy<span className="text-brand-400">Cult</span>
          </span>
        </a>

        <nav
          className="hidden items-center gap-7 sm:flex"
          aria-label="Navegación"
        >
          {SEGMENTS.map((s) => (
            <a
              key={s.label}
              href={s.href}
              className="font-mono text-[0.7rem] font-medium uppercase tracking-[0.18em] text-white/40 transition-colors hover:text-brand-300"
            >
              {s.label}
            </a>
          ))}
        </nav>

        <a
          href="#ingresar"
          className="inline-flex h-9 items-center rounded-lg border border-brand-500/40 bg-brand-500/10 px-4 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-brand-300 transition-colors hover:bg-brand-500/20 hover:text-brand-200"
        >
          Ingresar
        </a>
      </div>
    </header>
  );
}