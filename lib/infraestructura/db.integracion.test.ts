import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { sql } from "drizzle-orm"
import type { ConexionBd } from "@/lib/infraestructura/db"
import { crearConexionPruebas } from "@/pruebas/arnes-bd"

// Pruebas de integracion contra PostgreSQL real (ADR-006). Requieren DATABASE_URL_TEST y el
// guard del arnes las limita a una base local terminada en _test. Sin base configurada fallan
// a proposito: no se da por pasada una prueba que no pudo ejecutarse.

const TABLA = "prueba_infraestructura_tx"

describe("conexion y transacciones con PostgreSQL", () => {
  let conexion: ConexionBd | undefined

  // Si la conexion no pudo crearse, beforeAll ya informo la causa real.
  function bd() {
    if (!conexion) throw new Error("La conexion de pruebas no esta disponible.")
    return conexion.db
  }

  beforeAll(() => {
    conexion = crearConexionPruebas()
  })

  afterEach(async () => {
    await conexion?.db.execute(sql.raw(`DROP TABLE IF EXISTS ${TABLA}`))
  })

  afterAll(async () => {
    await conexion?.pool.end()
  })

  async function existeTabla(): Promise<boolean> {
    const resultado = await bd().execute(sql`SELECT to_regclass(${`public.${TABLA}`}) AS tabla`)
    return (resultado.rows[0] as { tabla: string | null }).tabla !== null
  }

  async function contarFilas(): Promise<number> {
    const resultado = await bd().execute(sql.raw(`SELECT count(*)::int AS total FROM ${TABLA}`))
    return (resultado.rows[0] as { total: number }).total
  }

  it("se conecta a la base aislada de pruebas", async () => {
    const resultado = await bd().execute(sql`SELECT current_database() AS nombre, 1 AS uno`)
    const fila = resultado.rows[0] as { nombre: string; uno: number }
    expect(fila.uno).toBe(1)
    expect(fila.nombre).toMatch(/_test$/)
  })

  it("revierte todos los cambios cuando la transaccion falla", async () => {
    await expect(
      bd().transaction(async (tx) => {
        await tx.execute(sql.raw(`CREATE TABLE ${TABLA} (id integer PRIMARY KEY)`))
        await tx.execute(sql.raw(`INSERT INTO ${TABLA} (id) VALUES (1)`))
        throw new Error("fallo simulado")
      }),
    ).rejects.toThrow("fallo simulado")

    expect(await existeTabla()).toBe(false)
  })

  it("confirma los cambios cuando la transaccion termina bien", async () => {
    await bd().transaction(async (tx) => {
      await tx.execute(sql.raw(`CREATE TABLE ${TABLA} (id integer PRIMARY KEY)`))
      await tx.execute(sql.raw(`INSERT INTO ${TABLA} (id) VALUES (1)`))
    })

    expect(await existeTabla()).toBe(true)
    expect(await contarFilas()).toBe(1)
  })

  it("una restriccion violada a mitad de la transaccion no deja efectos parciales", async () => {
    await bd().execute(sql.raw(`CREATE TABLE ${TABLA} (id integer PRIMARY KEY)`))

    await expect(
      bd().transaction(async (tx) => {
        await tx.execute(sql.raw(`INSERT INTO ${TABLA} (id) VALUES (1)`))
        await tx.execute(sql.raw(`INSERT INTO ${TABLA} (id) VALUES (1)`))
      }),
    ).rejects.toThrow()

    expect(await contarFilas()).toBe(0)
  })
})
