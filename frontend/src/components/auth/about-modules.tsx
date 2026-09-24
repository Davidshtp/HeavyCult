import { MODULES } from "@/components/auth/about-data";

export function AboutModules() {
  return (
    <section className="flex flex-col items-center">
      <p className="font-mono text-[0.8rem] font-medium uppercase tracking-[0.35em] text-brand-400/80">
        [ // Módulos clave ]
      </p>
      <h3 className="mt-2 font-heading text-2xl font-bold text-white">
        El ciclo completo en cinco módulos.
      </h3>
      <div className="mt-8 grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
        {MODULES.map((m) => (
          <article
            key={m.id}
            className="group flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-brand-400/40"
          >
            <p className="font-mono text-base font-semibold text-brand-400">
              [ {m.id} ]
            </p>
            <h4 className="font-heading text-lg font-bold uppercase tracking-[0.12em] text-white">
              {m.title}
            </h4>
            <p className="text-base leading-relaxed text-white/45">
              {m.description}
            </p>
            <p className="mt-auto font-mono text-[0.85rem] font-medium tracking-[0.1em] text-white/30">
              {m.tag}
            </p>
          </article>
        ))}
        <a
          href="#ingresar"
          className="flex min-h-24 flex-col items-start justify-center gap-1 rounded-2xl border border-brand-500/40 bg-brand-500/10 p-6 transition-colors hover:bg-brand-500/20"
        >
          <span className="font-mono text-base font-semibold text-brand-300">
            → Ingresa y usa HeavyCult
          </span>
          <span className="font-mono text-[0.85rem] tracking-[0.1em] text-white/40">
            panel de control unificado
          </span>
        </a>
      </div>
    </section>
  );
}