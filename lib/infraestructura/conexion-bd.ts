import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

// Conexion a PostgreSQL con Drizzle y `pg` (ADR-003), sin ninguna dependencia de Next. La usan
// db.ts (la aplicacion, solo servidor), el arnes de pruebas y los scripts de operacion como el
// alta de la Administradora, que corren fuera de Next. La aplicacion debe importar `db.ts`.

export type ConexionBd = { pool: Pool; db: NodePgDatabase }

const MAXIMO_CONEXIONES = 10
const ESPERA_CONEXION_MS = 5_000

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
