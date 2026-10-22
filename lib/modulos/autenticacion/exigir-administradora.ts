import "server-only"
import { obtenerAuth } from "@/lib/infraestructura/auth"
import { crearExigirAdministradora, type VerificadorSesion } from "@/lib/modulos/autenticacion/contrato"
import { crearVerificadorDeSesion } from "@/lib/modulos/autenticacion/verificador-better-auth"

// Instancia que usa la aplicacion: valida la sesion real de Better Auth (tarea 2.4). Se resuelve
// la instancia de Better Auth en cada llamada, no al importar, para no exigir base de datos ni
// secretos durante `next build`. Para probar un modulo propio sin sesiones reales, crear una
// instancia con `crearExigirAdministradora(verificadorFalso)` desde "contrato" e inyectarla.
const verificadorBetterAuth: VerificadorSesion = (encabezados) =>
  crearVerificadorDeSesion(obtenerAuth())(encabezados)

export const exigirAdministradora = crearExigirAdministradora(verificadorBetterAuth)
