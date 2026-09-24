"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import type { Usuario } from "@/lib/types";

interface PerfilContextValue {
  usuario: Usuario | null;
  cargando: boolean;
  refrescar: () => Promise<void>;
  actualizarLocal: (cambios: Partial<Usuario>) => void;
}

const PerfilContext = createContext<PerfilContextValue | undefined>(undefined);

export function PerfilProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  const refrescar = useCallback(async () => {
    try {
      const perfil = await apiRequest<Usuario>("/auth/perfil");
      setUsuario(perfil);
    } catch {
      router.replace("/login");
    } finally {
      setCargando(false);
    }
  }, [router]);

  useEffect(() => {
    refrescar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const actualizarLocal = useCallback((cambios: Partial<Usuario>) => {
    setUsuario((prev) => (prev ? { ...prev, ...cambios } : prev));
  }, []);

  return (
    <PerfilContext.Provider
      value={{ usuario, cargando, refrescar, actualizarLocal }}
    >
      {children}
    </PerfilContext.Provider>
  );
}

export function usePerfil(): PerfilContextValue {
  const ctx = useContext(PerfilContext);
  if (!ctx) throw new Error("usePerfil debe usarse dentro de PerfilProvider");
  return ctx;
}

export async function cerrarSesion(router: {
  replace: (ruta: string) => void;
  refresh: () => void;
}) {
  try {
    await apiRequest("/auth/logout", { method: "POST" });
  } catch {
    // Ignorado: la redirección ocurre igual
  }
  router.replace("/login");
  router.refresh();
}