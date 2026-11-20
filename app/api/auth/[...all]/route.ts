import { obtenerAuth } from "@/lib/infraestructura/auth"
import { atenderSolicitudAuth } from "@/lib/infraestructura/auth-manejador"

// Endpoint de Better Auth (ADR-004, ADR-008): login, sesión, recuperación y cambio de
// contraseña. El registro público está deshabilitado en la configuración.
//
// La instancia se obtiene en cada solicitud y no al importar el modulo, para que `next build`
// no exija base de datos ni secretos. Las respuestas son privadas: nunca se cachean. Cualquier
// falla interna (por ejemplo, base caida) se responde con un error generico y seguro.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export function GET(solicitud: Request): Promise<Response> {
  return atenderSolicitudAuth(() => obtenerAuth().handler(solicitud))
}

export function POST(solicitud: Request): Promise<Response> {
  return atenderSolicitudAuth(() => obtenerAuth().handler(solicitud))
}
