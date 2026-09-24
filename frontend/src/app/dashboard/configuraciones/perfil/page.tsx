import { CambiarContrasenaForm } from "@/components/dashboard/configuraciones/cambiar-contrasena-form";
import { MiPerfilForm } from "@/components/dashboard/configuraciones/mi-perfil-form";
import { ResumenPerfil } from "@/components/dashboard/configuraciones/resumen-perfil";

export default function MiPerfilPage() {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="space-y-6">
        <MiPerfilForm />
        <CambiarContrasenaForm />
      </div>
      <ResumenPerfil />
    </div>
  );
}