import type { crearAuth } from "@/lib/infraestructura/auth-config"
import type { VerificadorSesion } from "@/lib/modulos/autenticacion/contrato"

// Conecta el contrato `exigirAdministradora` con las sesiones reales de Better Auth (tarea 2.4).
// No importa Next ni `server-only`, para poder probarlo con una instancia de Better Auth sobre
// la base de pruebas; la instancia de la aplicacion se arma en exigir-administradora.ts.
type InstanciaAuth = Pick<ReturnType<typeof crearAuth>, "api">

/**
 * Resuelve la identidad a partir de los encabezados de la solicitud (cookie de sesion).
 * Devuelve `null` si no hay sesion valida: ausente, vencida, revocada o cookie manipulada. Una
 * falla tecnica (por ejemplo, base caida) se propaga: nunca concede acceso.
 */
export function crearVerificadorDeSesion(auth: InstanciaAuth): VerificadorSesion {
  return async (encabezados) => {
    const sesion = await auth.api.getSession({ headers: encabezados })
    if (!sesion) return null
    // Solo los tres campos del contrato: el token y el resto de la sesion no salen de aca.
    return { id: sesion.user.id, nombre: sesion.user.name, email: sesion.user.email }
  }
}
