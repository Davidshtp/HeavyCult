"use client";

import { Avatar } from "@/components/dashboard/avatar";
import { EstadoBadge } from "@/components/dashboard/estado-badge";
import { RolBadge } from "@/components/dashboard/rol-badge";
import { usePerfil } from "@/components/dashboard/perfil-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatFecha, formatTiempoRelativo } from "@/lib/format";

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="font-mono text-[0.75rem] tracking-[0.14em] text-muted-foreground uppercase">
        {etiqueta}
      </span>
      <span className="truncate text-right text-white/80">{valor}</span>
    </div>
  );
}

export function ResumenPerfil() {
  const { usuario, cargando } = usePerfil();

  if (cargando || !usuario) {
    return (
      <Card>
        <CardContent className="space-y-3 p-4">
          <Skeleton className="mx-auto size-20 rounded-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-40" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-base uppercase tracking-wide">
          Resumen
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3">
        <Avatar
          nombre={usuario.nombre}
          apellido={usuario.apellido}
          urlImagen={usuario.url_imagen}
          className="size-20 text-xl"
        />
        <div className="text-center">
          <p className="font-heading text-lg font-semibold">
            {usuario.nombre} {usuario.apellido}
          </p>
          <p className="text-sm text-muted-foreground">{usuario.correo}</p>
        </div>
        <div className="flex items-center gap-2">
          <RolBadge rol={usuario.rol} />
          <EstadoBadge estado={usuario.estado} />
        </div>
        <div className="mt-1 w-full space-y-2 border-t border-white/10 pt-3">
          <Fila etiqueta="ID" valor={`#${usuario.id_usuario}`} />
          <Fila etiqueta="Registro" valor={formatFecha(usuario.fecha_registro)} />
          <Fila
            etiqueta="Último acceso"
            valor={formatTiempoRelativo(usuario.ultimo_acceso)}
          />
          <Fila
            etiqueta="Antigüedad"
            valor={formatTiempoRelativo(usuario.fecha_registro)}
          />
        </div>
      </CardContent>
    </Card>
  );
}