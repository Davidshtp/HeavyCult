export function formatFecha(fecha?: string | null): string {
  if (!fecha) return "—";
  return new Date(fecha).toLocaleString("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function formatTiempoRelativo(fecha?: string | null): string {
  if (!fecha) return "—";
  const diferenciaMs = Date.now() - new Date(fecha).getTime();
  if (diferenciaMs < 0) return "Recién ahora";

  const minutos = Math.floor(diferenciaMs / 60_000);
  if (minutos < 1) return "Hace un momento";
  if (minutos < 60) return `Hace ${minutos} ${minutos === 1 ? "minuto" : "minutos"}`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `Hace ${horas} ${horas === 1 ? "hora" : "horas"}`;

  const dias = Math.floor(horas / 24);
  if (dias < 30) return `Hace ${dias} ${dias === 1 ? "día" : "días"}`;

  const meses = Math.floor(dias / 30);
  if (meses < 12)
    return `Hace ${meses} ${meses === 1 ? "mes" : "meses"}`;

  const anios = Math.floor(dias / 365);
  return `Hace ${anios} ${anios === 1 ? "año" : "años"}`;
}

export function formatMoneda(valor: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor);
}

export function formatPorcentaje(valor: number): string {
  return `${valor.toLocaleString("es-CO", {
    maximumFractionDigits: 1,
  })}%`;
}