import { migrate } from "drizzle-orm/node-postgres/migrator"
import { crearConexionBd } from "../lib/infraestructura/db"
import { validarUrlBdPruebas } from "./guardia-url-bd"

// globalSetup del proyecto "integracion" (vitest.config.mts): antes de todas las pruebas deja
// la base de pruebas con las migraciones aplicadas, una sola vez por corrida. Asi los archivos
// de prueba, que Vitest ejecuta en paralelo, no compiten por crear las mismas tablas.
// El guard impide que se aplique contra una base que no sea la local de pruebas.
export default async function preparar(): Promise<void> {
  const url = validarUrlBdPruebas(process.env.DATABASE_URL_TEST, process.env.DATABASE_URL)
  const { pool, db } = crearConexionBd(url)
  try {
    await migrate(db, { migrationsFolder: "./drizzle" })
  } finally {
    await pool.end()
  }
}
