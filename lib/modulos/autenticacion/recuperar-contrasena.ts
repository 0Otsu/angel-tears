import { z } from "zod"
import { reglaContrasenaNueva } from "@/lib/modulos/autenticacion/politica-contrasena"

// Recuperacion de contrasena por email (tareas 3.1 y 3.2): pedir el enlace y restablecer.
// Modulo puro: recibe el cliente de Better Auth por parametro, asi se prueba sin navegador.
//
// Reglas (decisiones J1 a J4 y cierre de Auth del 19/10/2026):
//  - El pedido responde SIEMPRE lo mismo, exista o no la cuenta y llegue o no el correo: la unica
//    diferencia que se informa es el limite de intentos, que no depende de la cuenta.
//  - El enlace dura 1 hora y sirve una sola vez; al restablecer se cierran todas las sesiones y
//    NO se inicia sesion automaticamente: despues hay que ingresar con la contrasena nueva.

/** Ruta del formulario de restablecimiento; Better Auth redirige ahi con ?token=... */
export const RUTA_RESTABLECER = "/admin/restablecer"

type ErrorDeCliente = { status?: number; code?: string } | null

export type ClienteRecuperacion = {
  requestPasswordReset(entrada: { email: string; redirectTo: string }): Promise<{ error: ErrorDeCliente }>
  resetPassword(entrada: { newPassword: string; token: string }): Promise<{ error: ErrorDeCliente }>
}

export type ResultadoSolicitud =
  | { estado: "solicitada" }
  | { estado: "email_invalido"; mensaje: string }
  | { estado: "demasiados_intentos" }

export type ErroresRestablecer = Partial<Record<"contrasenaNueva" | "confirmacion", string>>

export type ResultadoRestablecer =
  | { estado: "ok" }
  | { estado: "datos_invalidos"; errores: ErroresRestablecer }
  | { estado: "enlace_invalido" }
  | { estado: "demasiados_intentos" }
  | { estado: "error_tecnico" }

const esquemaEmail = z.email({ error: "Ingresá un correo válido." })

/**
 * Pide el enlace. Cualquier resultado distinto de un correo mal escrito o del limite de intentos
 * se informa como «solicitada»: incluidas las fallas del servidor, para no revelar nada de la
 * cuenta ni del estado del envio.
 */
export async function solicitarRecuperacion(
  cliente: ClienteRecuperacion,
  email: string,
): Promise<ResultadoSolicitud> {
  const validacion = esquemaEmail.safeParse(email.trim())
  if (!validacion.success) return { estado: "email_invalido", mensaje: validacion.error.issues[0].message }

  try {
    const { error } = await cliente.requestPasswordReset({ email: validacion.data, redirectTo: RUTA_RESTABLECER })
    if (error?.status === 429) return { estado: "demasiados_intentos" }
  } catch {
    // Red o servidor caidos: misma respuesta neutra que si todo hubiera ido bien.
  }
  return { estado: "solicitada" }
}

const esquemaRestablecer = z
  .object({
    contrasenaNueva: reglaContrasenaNueva,
    confirmacion: z.string().min(1, { error: "Repetí la contraseña nueva." }),
  })
  .refine((datos) => datos.contrasenaNueva === datos.confirmacion, {
    path: ["confirmacion"],
    error: "Las contraseñas no coinciden.",
  })

export async function restablecerContrasena(
  cliente: ClienteRecuperacion,
  datos: { token: string | undefined; contrasenaNueva: string; confirmacion: string },
): Promise<ResultadoRestablecer> {
  if (!datos.token) return { estado: "enlace_invalido" }

  const validacion = esquemaRestablecer.safeParse(datos)
  if (!validacion.success) {
    const errores: ErroresRestablecer = {}
    for (const problema of validacion.error.issues) {
      const campo = problema.path[0] as keyof ErroresRestablecer
      errores[campo] ??= problema.message
    }
    return { estado: "datos_invalidos", errores }
  }

  try {
    const { error } = await cliente.resetPassword({ newPassword: datos.contrasenaNueva, token: datos.token })
    if (!error) return { estado: "ok" }
    if (error.code === "INVALID_TOKEN" || error.code === "USER_NOT_FOUND") return { estado: "enlace_invalido" }
    if (error.code === "PASSWORD_TOO_SHORT" || error.code === "PASSWORD_TOO_LONG") {
      return { estado: "datos_invalidos", errores: { contrasenaNueva: "La contraseña nueva no cumple el largo permitido (8 a 128 caracteres)." } }
    }
    if (error.status === 429) return { estado: "demasiados_intentos" }
    return { estado: "error_tecnico" }
  } catch {
    return { estado: "error_tecnico" }
  }
}
