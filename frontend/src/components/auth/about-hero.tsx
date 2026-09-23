import { INTEGRATIONS } from "@/components/auth/about-data";

export function AboutHero() {
  return (
    <section className="flex flex-col items-center text-center">
      <p className="font-mono text-[0.65rem] font-medium uppercase tracking-[0.35em] text-brand-400/80">
        [ // Información ]
      </p>
      <h2 className="mt-3 font-heading text-3xl font-bold text-white">
        Un ERP que orquesta todo tu negocio.
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/50">
        HeavyCult ERP centraliza, automatiza y escala operaciones de comercio
        electrónico y dropshipping con pago contra entrega. En un solo panel de
        control: publicidad multicanal, atención al cliente impulsada por IA,
        gestión logística con Dropi y analítica financiera en tiempo real.
      </p>
      <ul className="mt-7 flex max-w-3xl flex-wrap items-center justify-center gap-2">
        {INTEGRATIONS.map((i) => (
          <li
            key={i}
            className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 font-mono text-[0.7rem] font-medium uppercase tracking-[0.14em] text-white/60"
          >
            {i}
          </li>
        ))}
      </ul>
    </section>
  );
}