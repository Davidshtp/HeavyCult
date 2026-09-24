"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, Trash2 } from "lucide-react";

const TAMANO_MAX_BYTES = 2 * 1024 * 1024;
const FORMATOS_PERMITIDOS = ["image/png", "image/jpeg", "image/webp"];

export function FotoPerfilInput({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (valor: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  function manejarArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    if (!FORMATOS_PERMITIDOS.includes(archivo.type)) {
      setError("Formato no permitido. Usa PNG, JPG o WebP.");
      return;
    }
    if (archivo.size > TAMANO_MAX_BYTES) {
      setError("La imagen supera los 2 MB.");
      return;
    }
    setError(null);
    const lector = new FileReader();
    lector.onload = () =>
      onChange(typeof lector.result === "string" ? lector.result : null);
    lector.readAsDataURL(archivo);
  }

  function quitar() {
    onChange(null);
    setError(null);
  }

  return (
    <div className="grid justify-items-center gap-3">
      <div className="group relative size-32 lg:size-36">
        <div
          aria-hidden
          className="absolute -inset-1.5 rounded-full bg-linear-to-tr from-brand-500 via-violet-500 to-fuchsia-500 opacity-40 blur-lg transition-opacity duration-300 group-hover:opacity-80"
        />

        {value ? (
          <div className="relative size-full rounded-full bg-linear-to-tr from-brand-500 via-violet-500 to-fuchsia-500 p-1 shadow-lg shadow-brand-950/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Foto de perfil"
              className="size-full rounded-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="relative grid size-full place-items-center rounded-full border-2 border-dashed border-white/25 bg-white/[0.03] text-muted-foreground transition-colors hover:border-brand-400/60 hover:text-brand-300"
          >
            <ImagePlus className="size-10" />
          </button>
        )}

        {value && (
          <div className="absolute inset-1 flex items-center justify-center gap-2 rounded-full bg-black/75 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              title="Cambiar foto"
              className="grid size-11 place-items-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/25"
            >
              <Camera className="size-5" />
            </button>
            <button
              type="button"
              onClick={quitar}
              title="Quitar foto"
              className="grid size-11 place-items-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-destructive"
            >
              <Trash2 className="size-5" />
            </button>
          </div>
        )}
      </div>

      <div className="text-center">
        <p className="font-mono text-[0.75rem] tracking-[0.15em] text-muted-foreground uppercase">
          Foto de perfil
        </p>
        <p className="mt-0.5 text-sm text-white/30">
          PNG · JPG · WebP · máx 2 MB
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept={FORMATOS_PERMITIDOS.join(",")}
        className="hidden"
        onChange={manejarArchivo}
      />
    </div>
  );
}