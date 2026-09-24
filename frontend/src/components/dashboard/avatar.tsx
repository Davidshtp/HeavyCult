"use client";

import { useState } from "react";
import { cn } from "cn";

export function iniciales(nombre: string, apellido: string): string {
  return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
}

function svgAvatar(emoji: string, fondo: string, acento: string): string {
  const contenido = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='${fondo}'/><circle cx='50' cy='50' r='47' fill='none' stroke='${acento}' stroke-width='4' opacity='0.3'/><text x='50' y='56' font-size='44' text-anchor='middle' dominant-baseline='central'>${emoji}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(contenido)}`;
}

const AVATARES_DEFAULT = [
  svgAvatar("👾", "#7c5cff", "#b9a8ff"),
  svgAvatar("🤘", "#b34700", "#ff8a5c"),
  svgAvatar("🦇", "#33226b", "#7c5cff"),
  svgAvatar("💀", "#3f6212", "#84cc16"),
  svgAvatar("🦾", "#0f766e", "#2dd4bf"),
  svgAvatar("🎸", "#9f1239", "#fb7185"),
];

function avatarPorDefecto(semilla: string): string {
  let hash = 0;
  for (let i = 0; i < semilla.length; i += 1) {
    hash = (hash * 31 + semilla.charCodeAt(i)) >>> 0;
  }
  return AVATARES_DEFAULT[hash % AVATARES_DEFAULT.length]!;
}

export function Avatar({
  nombre,
  apellido,
  urlImagen,
  className,
}: {
  nombre: string;
  apellido: string;
  urlImagen?: string | null;
  className?: string;
}) {
  const [roto, setRoto] = useState(false);
  const src =
    urlImagen && !roto
      ? urlImagen
      : avatarPorDefecto(`${nombre} ${apellido}`);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`${nombre} ${apellido}`}
      className={cn(
        "size-9 shrink-0 rounded-full object-cover ring-1 ring-white/15",
        className,
      )}
      onError={() => setRoto(true)}
    />
  );
}