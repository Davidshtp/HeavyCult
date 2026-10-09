"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

/**
 * El topbar muestra el nombre de la ruta actual (Visión general, Productos,
 * etc). En el detalle de un producto eso no alcanza: interesa el nombre del
 * producto que se está mirando, así que la página se lo publica acá y el
 * topbar lo muestra por encima del título fijo de la ruta.
 */
const TituloContexto = createContext<{
  titulo: string | null;
  setTitulo: (valor: string | null) => void;
}>({ titulo: null, setTitulo: () => {} });

export function ProveedorTitulo({ children }: { children: React.ReactNode }) {
  const [titulo, setTitulo] = useState<string | null>(null);
  const valor = useMemo(() => ({ titulo, setTitulo }), [titulo]);

  return (
    <TituloContexto.Provider value={valor}>{children}</TituloContexto.Provider>
  );
}

export function useTituloPagina(valor: string | null) {
  const { setTitulo } = useContext(TituloContexto);

  useEffect(() => {
    setTitulo(valor);
    // Al desmontar (o cambiar de producto) se limpia, para que la siguiente
    // página no herede el nombre del anterior.
    return () => setTitulo(null);
  }, [valor, setTitulo]);
}

export function useTituloTopbar(): string | null {
  return useContext(TituloContexto).titulo;
}