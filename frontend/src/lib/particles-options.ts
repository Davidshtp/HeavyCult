import type { ISourceOptions } from "@tsparticles/engine";

export function buildParticleOptions(reduced: boolean): ISourceOptions {
  return {
    fullScreen: { enable: false },
    fpsLimit: reduced ? 30 : 60,
    background: { color: "transparent" },
    detectRetina: true,
    zIndex: 0,
    interactivity: {
      events: {
        onClick: { enable: false },
        onHover: { enable: false },
        resize: { enable: true },
      },
    },
    particles: {
      number: {
        value: reduced ? 24 : 70,
        density: { enable: true },
      },
      color: { value: ["#c4b5fd", "#a78bfa", "#ffffff"] },
      shape: { type: "circle" },
      opacity: { value: 0.6 },
      size: { value: { min: 1, max: 2.2 } },
      links: {
        enable: true,
        distance: 150,
        color: "rgba(139,92,246,0.55)",
        opacity: 0.35,
        width: 1,
      },
      move: {
        enable: true,
        speed: reduced ? 0.3 : 1.2,
        direction: "none",
        random: true,
        straight: false,
        outModes: { default: "out" },
      },
    },
  };
}