import { AboutHero } from "@/components/auth/about-hero";
import { AboutModules } from "@/components/auth/about-modules";

export function AuthAbout() {
  return (
    <section
      id="informacion"
      className="mx-auto flex w-full max-w-4xl scroll-mt-28 flex-col items-center gap-14"
      aria-label="Información de la plataforma"
    >
      <AboutHero />
      <AboutModules />
    </section>
  );
}