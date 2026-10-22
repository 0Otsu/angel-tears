import { z } from "zod"

// Cambio de contrasena estando autenticada (tarea 3.5, decision de producto del 21/10/2026,
// seccion 10): se verifica la contrasena actual, se conserva la sesion desde la que se hace el
// cambio SIN extender su maximo de 30 dias y se invalidan todas las demas.
//
// Por que son dos pasos y no `changePassword({ revokeOtherSessions: true })`: en Better Auth
// 1.7.11 esa opcion borra TODAS las sesiones (tambien la actual), crea una nueva y fija una
// cookie nueva, es decir, reemplaza la sesion actual y le reinicia los 30 dias. La forma nativa
// de cerrar solo las otras es el endpoint /revoke-other-sessions, que deja intacta la actual.
// Los dos pasos no son atomicos: si el segundo falla, la contrasena ya cambio y las otras
// sesiones siguen abiertas; ese caso se informa y se puede reintentar (`cerrarOtrasSesiones`).
//
// Modulo puro: recibe el cliente de Better Auth por parametro, asi se prueba sin navegador.

type ErrorDeCliente = { status?: number; code?: string } | null

export type ClienteCambioContrasena = {
  changePassword(entrada: { currentPassword: string; newPassword: string }): Promise<{ error: ErrorDeCliente }>
  revokeOtherSessions(): Promise<{ error: ErrorDeCliente }>
}

// Mismo rango que acepta la libreria y que se exige al crear la cuenta (8 a 128 caracteres).
const esquema = z
  .object({
    contrasenaActual: z.string().min(1, { error: "Ingresá tu contraseña actual." }),
    contrasenaNueva: z
      .string()
      .min(8, { error: "La contraseña nueva debe tener al menos 8 caracteres." })
      .max(128, { error: "La contraseña nueva admite hasta 128 caracteres." }),
    confirmacion: z.string().min(1, { error: "Repetí la contraseña nueva." }),
  })
  .refine((datos) => datos.contrasenaNueva === datos.confirmacion, {
    path: ["confirmacion"],
    error: "Las contraseñas no coinciden.",
  })

export type CampoCambioContrasena = "contrasenaActual" | "contrasenaNueva" | "confirmacion"
export type ErroresCambioContrasena = Partial<Record<CampoCambioContrasena, string>>

export type ResultadoCambioContrasena =
  | { estado: "ok" }
  | { estado: "datos_invalidos"; errores: ErroresCambioContrasena }
  | { estado: "contrasena_actual_incorrecta" }
  | { estado: "sesion_vencida" }
  | { estado: "demasiados_intentos" }
  | { estado: "error_tecnico" }
  // La contrasena cambio, pero no se pudieron cerrar las otras sesiones: hay que reintentar.
  | { estado: "cambiada_sin_cerrar_otras" }

export type ResultadoCierreDeOtras =
  | { estado: "ok" }
  | { estado: "sesion_vencida" }
  | { estado: "demasiados_intentos" }
  | { estado: "error_tecnico" }

/** Valida los datos del formulario. Los mensajes nunca incluyen las contrasenas ingresadas. */
export function validarCambioContrasena(datos: unknown): ErroresCambioContrasena | null {
  const validacion = esquema.safeParse(datos)
  if (validacion.success) return null
  const errores: ErroresCambioContrasena = {}
  for (const problema of validacion.error.issues) {
    const campo = problema.path[0] as CampoCambioContrasena
    errores[campo] ??= problema.message
  }
  return errores
}

function estadoDeFalla(error: NonNullable<ErrorDeCliente>): "sesion_vencida" | "demasiados_intentos" | "error_tecnico" {
  if (error.status === 401) return "sesion_vencida"
  if (error.status === 429) return "demasiados_intentos"
  return "error_tecnico"
}

/** Cierra todas las sesiones salvo la actual, que sigue intacta. Se puede repetir sin riesgo. */
export async function cerrarOtrasSesiones(cliente: ClienteCambioContrasena): Promise<ResultadoCierreDeOtras> {
  try {
    const { error } = await cliente.revokeOtherSessions()
    return error ? { estado: estadoDeFalla(error) } : { estado: "ok" }
  } catch {
    return { estado: "error_tecnico" }
  }
}

export async function cambiarContrasena(
  cliente: ClienteCambioContrasena,
  datos: { contrasenaActual: string; contrasenaNueva: string; confirmacion: string },
): Promise<ResultadoCambioContrasena> {
  const errores = validarCambioContrasena(datos)
  if (errores) return { estado: "datos_invalidos", errores }

  try {
    const { error } = await cliente.changePassword({
      currentPassword: datos.contrasenaActual,
      newPassword: datos.contrasenaNueva,
    })
    if (error) {
      if (error.code === "INVALID_PASSWORD") return { estado: "contrasena_actual_incorrecta" }
      if (error.code === "PASSWORD_TOO_SHORT" || error.code === "PASSWORD_TOO_LONG") {
        return {
          estado: "datos_invalidos",
          errores: { contrasenaNueva: "La contraseña nueva no cumple el largo permitido (8 a 128 caracteres)." },
        }
      }
      return { estado: estadoDeFalla(error) }
    }
  } catch {
    return { estado: "error_tecnico" }
  }

  // La contrasena ya cambio. Si falla este paso, las otras sesiones siguen abiertas.
  const cierre = await cerrarOtrasSesiones(cliente)
  return cierre.estado === "ok" ? { estado: "ok" } : { estado: "cambiada_sin_cerrar_otras" }
}
