import "server-only"
import { crearExigirAdministradora, type VerificadorSesion } from "@/lib/modulos/autenticacion/contrato"

// Instancia que usa la aplicacion. TODAVIA NO HAY SESIONES REALES: hasta la tarea 2.4 (Better
// Auth), el verificador no reconoce a nadie, asi que `exigirAdministradora` rechaza toda
// solicitud. Falla cerrado a proposito: ninguna ruta privada queda abierta por error.
//
// Para probar un modulo propio sin esperar a Auth, no mockear este archivo: crear una instancia
// con `crearExigirAdministradora(verificadorFalso)` desde "contrato" e inyectarla en el caso de
// uso. La prueba con la sesion real llega con la tarea 2.4.
const verificadorSinSesiones: VerificadorSesion = async () => null

export const exigirAdministradora = crearExigirAdministradora(verificadorSinSesiones)
