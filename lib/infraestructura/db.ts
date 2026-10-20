import "server-only"
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

// Conexion a PostgreSQL con Drizzle y `pg` (ADR-003). Solo servidor: nunca importar desde
// Client Components. Pool por proceso y creacion en el primer uso, para que importar este
// modulo (por ejemplo durante `next build`) no exija una base de datos.

export type ConexionBd = { pool: Pool; db: NodePgDatabase }

const MAXIMO_CONEXIONES = 10
const ESPERA_CONEXION_MS = 5_000

// En desarrollo el hot reload re-evalua los modulos: se guarda en globalThis para no abrir
// un pool nuevo en cada recarga.
const globalBd = globalThis as typeof globalThis & { __angelTearsBd?: ConexionBd }

/**
 * Lee y valida una URL de PostgreSQL del entorno. Los mensajes de error nunca incluyen el
 * valor (contiene la contrasena).
 */
export function leerUrlBd(nombreVariable = "DATABASE_URL"): string {
  const valor = process.env[nombreVariable]
  if (!valor) {
    throw new Error(`Falta la variable de entorno ${nombreVariable}.`)
  }
  let url: URL
  try {
    url = new URL(valor)
  } catch {
    throw new Error(`${nombreVariable} no es una URL valida.`)
  }
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error(`${nombreVariable} debe usar el esquema postgresql://.`)
  }
  return valor
}

export function crearConexionBd(url: string): ConexionBd {
  const pool = new Pool({
    connectionString: url,
    max: MAXIMO_CONEXIONES,
    connectionTimeoutMillis: ESPERA_CONEXION_MS,
  })
  // Sin este manejador, un error en una conexion inactiva termina el proceso.
  pool.on("error", (error: Error & { code?: string }) => {
    console.error("[bd] error en una conexion inactiva de PostgreSQL", { codigo: error.code })
  })
  return { pool, db: drizzle(pool) }
}

export function obtenerDb(): NodePgDatabase {
  globalBd.__angelTearsBd ??= crearConexionBd(leerUrlBd())
  return globalBd.__angelTearsBd.db
}

export async function cerrarDb(): Promise<void> {
  const conexion = globalBd.__angelTearsBd
  if (!conexion) return
  delete globalBd.__angelTearsBd
  await conexion.pool.end()
}
