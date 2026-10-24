import "server-only"
import { after } from "next/server"
import { crearAuth } from "@/lib/infraestructura/auth-config"
import { obtenerDb } from "@/lib/infraestructura/db"

// Instancia de Better Auth que usa la aplicacion, sobre la base de DATABASE_URL. Se crea en el
// primer uso (como la conexion a la base) y se reutiliza. Solo servidor.
type InstanciaAuth = ReturnType<typeof crearAuth>

const globalAuth = globalThis as typeof globalThis & { __angelTearsAuth?: InstanciaAuth }

// El correo de recuperacion se envia DESPUES de responder, con `after` de Next: asi la respuesta
// tarda lo mismo exista o no la cuenta y el runtime mantiene viva la tarea hasta que termine
// (una promesa suelta puede cortarse al terminar la solicitud). Si no hay contexto de solicitud
// donde registrar la tarea, se deja correr sin esperarla.
function ejecutarDespuesDeResponder(tarea: Promise<unknown>): void {
  try {
    after(tarea)
  } catch {
    void tarea.catch(() => undefined)
  }
}

export function obtenerAuth(): InstanciaAuth {
  globalAuth.__angelTearsAuth ??= crearAuth(obtenerDb(), {
    ejecutarEnSegundoPlano: ejecutarDespuesDeResponder,
  })
  return globalAuth.__angelTearsAuth
}
