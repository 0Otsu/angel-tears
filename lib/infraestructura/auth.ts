import "server-only"
import { crearAuth } from "@/lib/infraestructura/auth-config"
import { obtenerDb } from "@/lib/infraestructura/db"

// Instancia de Better Auth que usa la aplicacion, sobre la base de DATABASE_URL. Se crea en el
// primer uso (como la conexion a la base) y se reutiliza. Solo servidor.
type InstanciaAuth = ReturnType<typeof crearAuth>

const globalAuth = globalThis as typeof globalThis & { __angelTearsAuth?: InstanciaAuth }

export function obtenerAuth(): InstanciaAuth {
  globalAuth.__angelTearsAuth ??= crearAuth(obtenerDb())
  return globalAuth.__angelTearsAuth
}
