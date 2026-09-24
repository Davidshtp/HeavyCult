import { ConfigTabs } from "@/components/dashboard/configuraciones/config-tabs";
import { SectionHeader } from "@/components/dashboard/section-header";

export default function ConfiguracionesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Configuraciones"
        description="Perfil, roles y conexiones de la plataforma"
      />
      <ConfigTabs />
      {children}
    </div>
  );
}