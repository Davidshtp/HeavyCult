"use client";

import { useMemo } from "react";
import Particles, {
  ParticlesProvider,
  useParticlesProvider,
} from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import { buildParticleOptions } from "@/lib/particles-options";

function ParticleCanvas() {
  const { loaded } = useParticlesProvider();

  const options = useMemo(
    () =>
      buildParticleOptions(
        typeof window !== "undefined" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      ),
    [],
  );

  if (!loaded) return null;

  return (
    <Particles
      id="heavycult-particles"
      className="pointer-events-none absolute inset-0 z-0"
      options={options}
    />
  );
}

export function ParticlesField() {
  return (
    <ParticlesProvider init={(engine) => loadSlim(engine)}>
      <ParticleCanvas />
    </ParticlesProvider>
  );
}