import "server-only"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import { crearConexionBd, leerUrlBd, type ConexionBd } from "@/lib/infraestructura/conexion-bd"

// Conexion a PostgreSQL de la aplicacion. Solo servidor: nunca importar desde Client
// Components. Pool por proceso y creacion en el primer uso, para que importar este modulo (por
// ejemplo durante `next build`) no exija una base de datos. La logica de conexion esta en
// conexion-bd.ts, que tambien usan las pruebas y los scripts fuera de Next.
export { crearConexionBd, leerUrlBd, type ConexionBd }

// En desarrollo el hot reload re-evalua los modulos: se guarda en globalThis para no abrir
// un pool nuevo en cada recarga.
const globalBd = globalThis as typeof globalThis & { __angelTearsBd?: ConexionBd }

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
