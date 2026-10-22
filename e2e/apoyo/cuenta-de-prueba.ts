import { sql } from "drizzle-orm"
import { crearConexionBd } from "../../lib/infraestructura/conexion-bd"
import { aprovisionarAdministradora } from "../../lib/modulos/autenticacion/aprovisionar-administradora"
import { validarUrlBdPruebas } from "../../pruebas/guardia-url-bd"

// Cuenta de la Administradora para los E2E, creada en la base de pruebas (la misma que usa el
// servidor de los E2E; ver playwright.config.ts). El guard impide tocar otra base.
export const EMAIL_DE_PRUEBA = "admin-e2e@ejemplo.com"
export const CONTRASENA_DE_PRUEBA = "contrasena-e2e-de-prueba-123"

try {
  process.loadEnvFile(".env.local")
} catch {
  // Sin archivo local se usan las variables ya definidas en el entorno.
}

async function conBaseDePruebas<T>(accion: (db: ReturnType<typeof crearConexionBd>) => Promise<T>): Promise<T> {
  const url = validarUrlBdPruebas(process.env.DATABASE_URL_TEST, process.env.DATABASE_URL)
  const conexion = crearConexionBd(url)
  try {
    return await accion(conexion)
  } finally {
    await conexion.pool.end()
  }
}

export async function crearCuentaDePrueba(): Promise<void> {
  await conBaseDePruebas(async (conexion) => {
    await conexion.db.execute(sql`DELETE FROM "user"`)
    await conexion.db.execute(sql`DELETE FROM rate_limit`)
    const resultado = await aprovisionarAdministradora(conexion, {
      email: EMAIL_DE_PRUEBA,
      nombre: "Administradora de prueba",
      contrasena: CONTRASENA_DE_PRUEBA,
    })
    if (resultado.estado !== "creada") {
      throw new Error(`No se pudo crear la cuenta de prueba: ${resultado.estado}`)
    }
  })
}

/**
 * Reinicia el contador del limite de intentos. Los E2E hacen varios logins seguidos desde la
 * misma IP y superarian el limite (3 por ventana de 10 s en el login); el limite en si se
 * prueba aparte, en las pruebas de integracion.
 */
export async function reiniciarLimiteDeIntentos(): Promise<void> {
  await conBaseDePruebas(async (conexion) => {
    await conexion.db.execute(sql`DELETE FROM rate_limit`)
  })
}

/** Simula que las sesiones de la cuenta de prueba ya vencieron (maximo de 30 dias cumplido). */
export async function vencerSesionesDePrueba(): Promise<void> {
  await conBaseDePruebas(async (conexion) => {
    await conexion.db.execute(sql`UPDATE session SET expires_at = now() - interval '1 minute'`)
  })
}

export async function borrarCuentaDePrueba(): Promise<void> {
  await conBaseDePruebas(async (conexion) => {
    await conexion.db.execute(sql`DELETE FROM "user"`)
    await conexion.db.execute(sql`DELETE FROM rate_limit`)
  })
}
