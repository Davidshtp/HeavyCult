export function normalizarShopHost(valor: string): string {
  const sinEsquema = valor.trim().replace(/^https?:\/\//i, '');
  const sinRuta = (sinEsquema.split('/')[0] ?? sinEsquema).trim();
  const host = sinRuta.replace(/^www\./i, '').toLowerCase();
  if (!host) return host;
  return host.includes('.myshopify.com')
    ? host
    : `${host.replace(/\.myshopify\.com$/, '')}.myshopify.com`;
}
