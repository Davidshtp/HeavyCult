"use client";

import { useEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/branding/brand-mark";
import { ECOSYSTEM_NODES } from "@/components/branding/brand-glyphs";

const INNER = new Set([0, 1, 2]);
const REPEL_RADIUS = 155;
const FOCUS_RADIUS = 95;
const PAD = 96;
const DAMPING = 0.94;
const STAR_FIELD = 130;
const SEED = 20260921;

type NodeState = {
  el: HTMLDivElement | null;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rx: number;
  ry: number;
};

type TinyStar = {
  nx: number;
  ny: number;
  r: number;
  base: number;
  tws: number;
  phase: number;
  drift: number;
};

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function EcosystemConstellation() {
  const asideRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nodesRef = useRef<NodeState[]>(
    ECOSYSTEM_NODES.map(() => ({
      el: null,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      rx: 0,
      ry: 0,
    })),
  );
  const starsRef = useRef<TinyStar[]>([]);
  const neighborsRef = useRef<number[][]>([]);
  const mouseRef = useRef({ active: false, x: -1, y: -1 });
  const sizeRef = useRef({ w: 0, h: 0 });
  const focusRef = useRef(-1);
  const [focusIdx, setFocusIdx] = useState(-1);

  useEffect(() => {
    const aside = asideRef.current;
    const canvas = canvasRef.current;
    if (!aside || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const nodeDefs = ECOSYSTEM_NODES;
    const mouse = mouseRef.current;

    const rand = mulberry32(SEED);
    starsRef.current = Array.from({ length: STAR_FIELD }, () => ({
      nx: rand(),
      ny: rand(),
      r: 0.6 + rand() * 1.1,
      base: 0.12 + rand() * 0.4,
      tws: 0.8 + rand() * 1.8,
      phase: rand() * Math.PI * 2,
      drift: 2 + rand() * 7,
    }));

    const setFocus = (idx: number) => {
      if (idx !== focusRef.current) {
        focusRef.current = idx;
        setFocusIdx(idx);
      }
    };

    const nearestFocus = () => {
      if (!mouse.active) return -1;
      let best = -1;
      let bestD2 = FOCUS_RADIUS * FOCUS_RADIUS;
      nodesRef.current.forEach((n, i) => {
        const d2 = (n.x - mouse.x) ** 2 + (n.y - mouse.y) ** 2;
        if (d2 < bestD2) {
          bestD2 = d2;
          best = i;
        }
      });
      return best;
    };

    const layout = () => {
      const rect = aside.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      sizeRef.current = { w, h };

      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cx = w / 2;
      const cy = h / 2;
      const base = Math.min(w, h);
      const ri = Math.max(110, base * 0.27);
      const ro = Math.max(160, base * 0.4);

      const existing = nodesRef.current;
      nodesRef.current = nodeDefs.map((_, i) => {
        const inner = INNER.has(i);
        const radius = inner ? ri : ro;
        const start = inner ? -Math.PI / 2 : -Math.PI / 2 + 0.5;
        const step = inner ? (Math.PI * 2) / 3 : (Math.PI * 2) / 5;
        const angle = start + (inner ? i : i - 3) * step;
        const x = Math.min(Math.max(cx + Math.cos(angle) * radius, PAD), w - PAD);
        const y = Math.min(Math.max(cy + Math.sin(angle) * radius, PAD), h - PAD);
        return {
          el: existing[i]?.el ?? null,
          x,
          y,
          vx: 0,
          vy: 0,
          rx: x,
          ry: y,
        };
      });

      neighborsRef.current = nodesRef.current.map((n) => {
        const dists = nodesRef.current
          .map((m, j) => ({ j, d2: (m.rx - n.rx) ** 2 + (m.ry - n.ry) ** 2 }))
          .sort((a, b) => a.d2 - b.d2);
        return dists.slice(1, 4).map((d) => d.j);
      });
    };

    const draw = (time: number) => {
      const { w, h } = sizeRef.current;
      if (w < 10 || h < 10) return;
      const cx = w / 2;
      const cy = h / 2;
      const focus = focusRef.current;
      const nodes = nodesRef.current;

      ctx.clearRect(0, 0, w, h);

      const t = reduceMotion ? 0 : time / 1000;

      starsRef.current.forEach((s) => {
        const alpha = reduceMotion
          ? s.base
          : s.base * (0.55 + 0.45 * Math.sin(t * s.tws * 2 + s.phase));
        ctx.fillStyle = `rgba(255,255,255,${Math.max(0, alpha).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(s.nx * w, s.ny * h, s.r, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      [0.27, 0.4].forEach((f) => {
        const r = Math.max(110, Math.min(w, h) * f);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      });

      neighborsRef.current.forEach((neigh, i) => {
        const a = nodes[i];
        neigh.forEach((j) => {
          if (j <= i) return;
          const b = nodes[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist > 300) return;
          const alpha = Math.max(0.03, 0.16 - dist / 1600);
          ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        });
      });

      nodes.forEach((n, i) => {
        const dist = Math.hypot(n.x - cx, n.y - cy);
        const alpha = Math.max(0.04, 0.24 - dist / 900);
        const def = nodeDefs[i];
        ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(n.x, n.y);
        ctx.stroke();

        const focused = focus === i;
        const haloR = focused ? 52 : 34;
        const halo = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, haloR);
        halo.addColorStop(0, `${def.color}${focused ? "8f" : "55"}`);
        halo.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(n.x, n.y, haloR, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = def.color;
        ctx.beginPath();
        ctx.arc(n.x, n.y, focused ? 7 : 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.beginPath();
        ctx.arc(n.x, n.y, focused ? 2.6 : 2, 0, Math.PI * 2);
        ctx.fill();

        const spark = focused ? 22 : 14;
        ctx.strokeStyle = `rgba(255,255,255,${focused ? 0.8 : 0.5})`;
        ctx.lineWidth = 1;
        [
          [1, 0],
          [0, 1],
        ].forEach(([dx, dy]) => {
          ctx.beginPath();
          ctx.moveTo(n.x - dx * spark, n.y - dy * spark);
          ctx.lineTo(n.x + dx * spark, n.y + dy * spark);
          ctx.stroke();
        });
      });

      const pulse = 62 + 10 * Math.sin((reduceMotion ? 0 : time) / 600);
      const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulse);
      halo.addColorStop(0, "rgba(167,139,250,0.30)");
      halo.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, pulse, 0, Math.PI * 2);
      ctx.fill();
    };

    const applyTransforms = () => {
      nodesRef.current.forEach((n) => {
        if (!n.el) return;
        n.el.style.transform = `translate(${n.x}px, ${n.y}px)`;
      });
    };

    const computeFocus = () => {
      const current = focusRef.current;
      if (current >= 0) {
        const n = nodesRef.current[current];
        if (
          n &&
          mouse.active &&
          (n.x - mouse.x) ** 2 + (n.y - mouse.y) ** 2 <
            REPEL_RADIUS * REPEL_RADIUS
        ) {
          return current;
        }
      }
      return nearestFocus();
    };

    const step = (time: number) => {
      if (!lastRef.current) lastRef.current = time;
      const dt = Math.min((time - lastRef.current) / 1000, 0.04);
      lastRef.current = time;

      const { w, h } = sizeRef.current;
      if (w >= 10 && h >= 10) {
        if (!reduceMotion) {
          starsRef.current.forEach((s) => {
            s.ny += (s.drift / h) * dt;
            if (s.ny > 1) s.ny -= 1;
          });
        }

        const nodes = nodesRef.current;
        nodes.forEach((n) => {
          let ax = 0;
          let ay = 0;
          if (mouse.active) {
            const dx = n.x - mouse.x;
            const dy = n.y - mouse.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < REPEL_RADIUS * REPEL_RADIUS && d2 > 0.001) {
              const d = Math.sqrt(d2);
              const f = (1 - d / REPEL_RADIUS) * 820;
              ax += (dx / d) * f;
              ay += (dy / d) * f;
            }
          }
          ax += (n.rx - n.x) * 4;
          ay += (n.ry - n.y) * 4;
          n.vx = (n.vx + ax * dt) * DAMPING;
          n.vy = (n.vy + ay * dt) * DAMPING;
          n.x += n.vx * dt;
          n.y += n.vy * dt;
          n.x = Math.min(Math.max(n.x, PAD), w - PAD);
          n.y = Math.min(Math.max(n.y, PAD), h - PAD);
        });

        setFocus(computeFocus());
        applyTransforms();
        draw(time);
      }
      rafRef.current = requestAnimationFrame(step);
    };

    const lastRef = { current: 0 };
    const rafRef: { current: number } = { current: 0 };

    const onPointerMove = (e: PointerEvent) => {
      const rect = aside.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
      if (reduceMotion) {
        setFocus(computeFocus());
        applyTransforms();
        draw(0);
      }
    };
    const onPointerLeave = () => {
      mouse.active = false;
      setFocus(-1);
      if (reduceMotion) {
        draw(0);
      }
    };

    aside.addEventListener("pointermove", onPointerMove);
    aside.addEventListener("pointerleave", onPointerLeave);

    const ro = new ResizeObserver(() => {
      layout();
      applyTransforms();
      draw(0);
    });
    ro.observe(aside);

    layout();
    applyTransforms();

    if (reduceMotion) {
      draw(0);
    } else {
      rafRef.current = requestAnimationFrame(step);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      aside.removeEventListener("pointermove", onPointerMove);
      aside.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return (
    <aside
      ref={asideRef}
      className="relative z-10 hidden flex-col justify-between p-12 pr-16 text-white lg:flex"
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <canvas ref={canvasRef} className="absolute inset-0" />

        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2.5">
          <div className="relative">
            <span className="animate-core-pulse absolute -inset-6 rounded-full bg-[radial-gradient(circle,rgba(167,139,250,0.5),rgba(139,92,246,0.16)_55%,transparent_75%)]" />
            <BrandMark className="relative size-20 drop-shadow-[0_8px_20px_rgba(124,58,237,0.55)]" />
          </div>
          <span className="font-heading text-xl font-semibold tracking-tight text-white/95">
            HeavyCult
          </span>
        </div>

        {ECOSYSTEM_NODES.map(({ label, desc, Glyph }, i) => (
          <div
            key={label}
            ref={(el) => {
              if (nodesRef.current && nodesRef.current[i]) {
                nodesRef.current[i].el = el;
              }
            }}
            data-focus={focusIdx === i ? "true" : "false"}
            className="ecosystem-star absolute size-0"
          >
            <span className="absolute -left-6 -top-6 size-12">
              <span data-slot="badge" className="ecosystem-star-badge grid size-12 place-items-center rounded-full bg-white/10 shadow-lg shadow-black/20 ring-1 ring-white/25 backdrop-blur-md">
                <Glyph className="size-5" />
              </span>
            </span>
            <span
              data-slot="label"
              className="ecosystem-star-label absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-7 whitespace-nowrap text-[11px] font-medium text-white/80"
            >
              {label}
            </span>
            <div
              className="ecosystem-card absolute bottom-full left-1/2 -translate-x-1/2"
              data-visible={focusIdx === i ? "true" : "false"}
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 ring-1 ring-white/20">
                <Glyph className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-white">
                  {label}
                </p>
                <p className="text-[11px] leading-snug text-white/65">{desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="relative z-10 mt-auto max-w-md rounded-2xl border border-white/10 bg-white/[0.06] p-4 ring-1 ring-white/15 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/45">
          Ecosistema
        </p>
        <p className="mt-1.5 text-lg font-semibold leading-snug tracking-tight text-white">
          Tu ecosistema de ventas,{" "}
          <span className="bg-linear-to-r from-brand-300 to-violet-300 bg-clip-text font-semibold text-transparent">
            en una sola vista.
          </span>
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/85 ring-1 ring-white/15">
            100% contra entrega (COD)
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/85 ring-1 ring-white/15">
            Operando en Colombia
          </span>
        </div>
      </div>

      <p className="relative z-10 mt-6 text-xs text-white/40">
        © {new Date().getFullYear()} HeavyCult
      </p>
    </aside>
  );
}