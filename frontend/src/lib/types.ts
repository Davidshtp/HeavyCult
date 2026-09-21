export type RolUsuario = "ADMIN" | "EMPLEADO";
export type EstadoUsuario = "ACTIVO" | "INACTIVO" | "BLOQUEADO";

export interface Usuario {
  id_usuario: number;
  nombre: string;
  apellido: string;
  correo: string;
  telefono?: string | null;
  rol: RolUsuario;
  estado: EstadoUsuario;
  url_imagen?: string | null;
  fecha_registro: string;
  ultimo_acceso?: string | null;
  intentos_fallidos: number;
  bloqueado_hasta?: string | null;
}

export interface LoginResponse {
  message: string;
  usuario: Usuario;
}