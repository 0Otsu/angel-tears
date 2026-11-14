import type { Pool, PoolClient } from "pg"

// Host NO secreto confirmado por Augusto el 14/11/2026. No inferir proyecto por neondb.
export const HOST_DEMO = "ep-falling-pond-b6o6kria.c-2.sa-east-1.aws.neon.tech"
export const MARCADOR_DEMO = "angel-tears-demo:20261118:v1"
export const EMAIL_DEMO = "demo.angeltears@example.com"

export class ErrorDemo extends Error {}

/** Se ejecuta antes de crear el pool. No utiliza DATABASE_URL ni URL de pruebas. */
export function leerDestinoDemo(entorno: Record<string, string | undefined>): string {
  if (entorno.VERCEL) throw new ErrorDemo("Los comandos demo solo se ejecutan desde una terminal local.")
  const valor = entorno.DEMO_DATABASE_URL_DIRECT
  let url: URL
  try { url = new URL(valor ?? "") } catch { throw new ErrorDemo("Falta una conexion DIRECTA de demo valida.") }
  const permitidos = new Set(["sslmode", "channel_binding"])
  if (!["postgres:", "postgresql:"].includes(url.protocol) || url.hostname !== HOST_DEMO
    || !["", "5432"].includes(url.port) || url.pathname !== "/neondb"
    || url.username !== "neondb_owner" || !url.password || url.hash
    || !["require", "verify-full"].includes(url.searchParams.get("sslmode") ?? "")
    || [...url.searchParams.keys()].some(k => !permitidos.has(k))
    || [...permitidos].some(k => url.searchParams.getAll(k).length > 1)
    || (url.searchParams.has("channel_binding") && url.searchParams.get("channel_binding") !== "require")) {
    throw new ErrorDemo("Destino rechazado: se exige el host directo aprobado, neondb/neondb_owner y SSL.")
  }
  return valor!
}

export function exigirConfirmacion(args: string[], operacion: string): void {
  if (args.length !== 1 || args[0] !== `--confirmar=${operacion}:angel-tears-demo`) {
    throw new ErrorDemo(`Se requiere --confirmar=${operacion}:angel-tears-demo. No se aceptan otros argumentos.`)
  }
}

export async function verificarIdentidadDemo(cliente: Pick<Pool | PoolClient, "query">, exigirMarcador = true) {
  const { rows } = await cliente.query<{ base: string; rol: string; version: number; marcador: string | null }>(
    "SELECT current_database() AS base, current_user AS rol, current_setting('server_version_num')::int AS version, shobj_description(oid, 'pg_database') AS marcador FROM pg_database WHERE datname = current_database()",
  )
  const identidad = rows[0]
  if (!identidad || identidad.base !== "neondb" || identidad.rol !== "neondb_owner" || identidad.version < 180000
    || (exigirMarcador && identidad.marcador !== MARCADOR_DEMO)) {
    throw new ErrorDemo("Identidad o marcador de demo incorrecto. No se autoriza ninguna escritura.")
  }
  return { host: HOST_DEMO, base: identidad.base, rol: identidad.rol, marcadorCorrecto: identidad.marcador === MARCADOR_DEMO }
}
