import { ParticlesField } from "@/components/particles-field";

export function AuthBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_-15%,rgba(124,58,237,0.28),transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_115%,rgba(139,92,246,0.14),transparent_70%)]" />
      <div className="absolute inset-0 bg-grid opacity-[0.07]" />

      <div className="absolute -left-28 top-1/4 size-80 rounded-full bg-brand-600/15 blur-3xl animate-drift" />
      <div className="absolute -right-24 bottom-1/4 size-96 rounded-full bg-brand-500/15 blur-3xl animate-drift-delayed" />
      <div className="absolute -bottom-36 left-1/3 size-[28rem] rounded-full bg-violet-700/10 blur-3xl animate-drift-slow" />

      <ParticlesField />

      <div className="absolute inset-0 bg-noise opacity-[0.05] mix-blend-overlay" />
    </div>
  );
}