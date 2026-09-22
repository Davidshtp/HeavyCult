import { z } from "zod";

export const loginSchema = z.object({
  correo: z
    .string()
    .min(1, "Ingresa tu correo.")
    .email("El correo no es válido."),
  contrasena: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres."),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const forgotSchema = z.object({
  correo: z
    .string()
    .min(1, "Ingresa tu correo.")
    .email("El correo no es válido."),
});

export type ForgotValues = z.infer<typeof forgotSchema>;

export const resetSchema = z
  .object({
    codigo: z
      .string()
      .min(1, "Ingresa el código.")
      .regex(
        /^[A-Fa-f0-9]{6}$/,
        "El código debe tener 6 caracteres HEX (A-F, 0-9).",
      ),
    nuevaContrasena: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres.")
      .regex(
        /^(?=.*[A-Za-z])(?=.*\d).+$/,
        "La contraseña debe contener letras y números.",
      ),
    confirmar: z.string().min(1, "Confirma la nueva contraseña."),
  })
  .refine((v) => v.nuevaContrasena === v.confirmar, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmar"],
  });

export type ResetValues = z.infer<typeof resetSchema>;