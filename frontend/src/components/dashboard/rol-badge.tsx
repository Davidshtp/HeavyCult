"use client";

import { Badge } from "@/components/ui/badge";
import type { RolUsuario } from "@/lib/types";

export function RolBadge({ rol }: { rol: RolUsuario }) {
  return (
    <Badge
      variant={rol === "ADMIN" ? "default" : "outline"}
      className={rol === "ADMIN" ? "border-transparent" : ""}
    >
      {rol === "ADMIN" ? "Administrador" : "Empleado"}
    </Badge>
  );
}