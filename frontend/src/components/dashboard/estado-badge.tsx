"use client";

import { Badge } from "@/components/ui/badge";
import type { EstadoProducto, EstadoUsuario } from "@/lib/types";
import { cn } from "cn";

type Estado = EstadoUsuario | EstadoProducto;

function estadoVar(estado: Estado): string {
  switch (estado) {
    case "ACTIVO":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
    case "INACTIVO":
      return "bg-muted text-muted-foreground";
    case "BLOQUEADO":
      return "bg-destructive/10 text-destructive dark:bg-destructive/20";
  }
}

function dotVar(estado: Estado): string {
  switch (estado) {
    case "ACTIVO":
      return "bg-emerald-500";
    case "INACTIVO":
      return "bg-muted-foreground";
    case "BLOQUEADO":
      return "bg-destructive";
  }
}

export function EstadoBadge({
  estado,
  className,
}: {
  estado: Estado;
  className?: string;
}) {
  return (
    <Badge className={cn(estadoVar(estado), className)}>
      <span className={cn("size-1.5 rounded-full", dotVar(estado))} />
      {estado}
    </Badge>
  );
}