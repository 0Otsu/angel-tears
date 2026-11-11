import { randomUUID } from "node:crypto"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { eq, sql } from "drizzle-orm"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import { crearConexionPruebas } from "@/pruebas/arnes-bd"
import { crearDatosFinanzas, limpiarDatosFinanzas } from "@/pruebas/datos-finanzas"
import { compra } from "@/lib/infraestructura/esquemas/compra"
import { venta } from "@/lib/infraestructura/esquemas/venta"
import { egreso } from "@/lib/infraestructura/esquemas/egreso"
import * as lecturaVentas from "@/lib/modulos/ventas/lectura"
import * as lecturaEgresos from "@/lib/modulos/egresos/lectura"
import { ErrorSesionRequerida } from "@/lib/modulos/autenticacion/contrato"
import { crearConsultaFinanzas } from "./agregacion"
import { crearLecturaFinanzas } from "./lectura"

describe("Finanzas: PostgreSQL aislado, tres fuentes y corte consistente", () => {
  let con: ReturnType<typeof crearConexionPruebas>
  const actorId = "actor-test-finanzas", h = new Headers(), filtro = { mes: "2020-01" }
  const exigir = async () => ({ id: actorId, nombre: "Prueba Finanzas", email: "finanzas@test.invalid" })
  const consulta = () => crearConsultaFinanzas(exigir, crearLecturaFinanzas(con.db))
  beforeAll(async () => {
    con = crearConexionPruebas()
    await con.db.execute(sql`INSERT INTO "user" (id,name,email) VALUES (${actorId},'Prueba Finanzas','finanzas@test.invalid') ON CONFLICT DO NOTHING`)
  })
  beforeEach(async () => { await limpiarDatosFinanzas(con.db, actorId); await crearDatosFinanzas(con.db, actorId) })
  afterEach(() => vi.restoreAllMocks())
  afterAll(async () => {
    if (!con) return
    try { await limpiarDatosFinanzas(con.db, actorId); await con.db.execute(sql`DELETE FROM "user" WHERE id=${actorId}`) }
    finally { await con.pool.end() }
  })

  it("reutiliza resúmenes vigentes exactos, excluye anulados y no duplica compras", async () => {
    const r = await consulta().consultar(h, filtro)
    expect(r).toMatchObject({ estado: "ok", resultado: "5.00", fuentes: {
      ventas: { resumen: { vigentes: { cantidad: 2, total: "10.30" }, anuladas: { cantidad: 1 } } },
      compras: { resumen: { vigentes: { cantidad: 1, total: "3.10" }, anuladas: { cantidad: 1 } } },
      egresos: { resumen: { vigentes: { cantidad: 1, total: "2.20" }, anuladas: { cantidad: 1 } } },
    } })
    if (r.estado !== "ok") throw Error("consulta")
    expect(r.operaciones).toHaveLength(4)
    expect(r.operaciones.filter(f => f.anulada)).toHaveLength(2)
    expect(r.operaciones.map(f => f.tipo).sort()).toEqual(["compras", "compras", "egresos", "egresos"])
  })
  it("usa fecha de operación inclusiva aunque la carga sea posterior; evoluciona solo lo vigente", async () => {
    const r = await consulta().consultar(h, filtro)
    expect(r).toMatchObject({ evolucion: [
      { fecha: "2020-01-01", ventas: "10.10", compras: "3.10", egresos: "0.00" },
      { fecha: "2020-01-31", ventas: "0.20", compras: "0.00", egresos: "2.20" },
    ] })
    expect((await consulta().consultar(h, { modo: "rango", desde: "2020-01-31", hasta: "2020-01-31" }))).toMatchObject({ resultado: "-2.00" })
  })
  it("agrupa por mes desde operaciones persistidas y conserva totales exactos", async () => {
    expect(await consulta().consultar(h, { modo: "rango", desde: "2020-01-01", hasta: "2020-12-31" })).toMatchObject({ resultado: "55.00", periodo: { agrupacion: "mes" }, evolucion: [
      { fecha: "2020-01-01", ventas: "10.30", compras: "3.10", egresos: "2.20" },
      { fecha: "2020-02-01", ventas: "50.00", compras: "0.00", egresos: "0.00" },
    ] })
  })
  it("vacío significa cero real y gráfico vacío, no error ni puntos inventados", async () => {
    expect(await consulta().consultar(h, { mes: "1800-01" })).toMatchObject({ resultado: "0.00", evolucion: [], operaciones: [], fuentes: { ventas: { resumen: { vigentes: { cantidad: 0, total: "0.00" } } } } })
  })
  it("filtros de historia no alteran resúmenes; Dashboard y Finanzas coinciden", async () => {
    const detalle = await consulta().consultar(h, { ...filtro, tipo: "egresos", estado: "anulado" })
    const resumen = await consulta().consultar(h, filtro, false)
    if (detalle.estado !== "ok" || resumen.estado !== "ok") throw Error("consulta")
    expect(detalle.operaciones).toHaveLength(1); expect(detalle.operaciones[0]).toMatchObject({ tipo: "egresos", anulada: true })
    expect(detalle.resultado).toBe(resumen.resultado)
    for (const f of ["ventas", "compras", "egresos"] as const) {
      expect(detalle.fuentes[f].estado === "ok" && detalle.fuentes[f].resumen).toEqual(resumen.fuentes[f].estado === "ok" && resumen.fuentes[f].resumen)
    }
    expect(resumen.evolucion).toEqual([]); expect(resumen.operaciones).toEqual([])
  })
  it("conserva exactitud para importes superiores al entero seguro de JavaScript", async () => {
    await con.db.update(venta).set({ total: "9999999999999999.99" }).where(eq(venta.actorId, actorId))
    expect(await consulta().consultar(h, filtro)).toMatchObject({ resultado: "19999999999999994.68" })
  })
  it("limita historia sin perder totales ni esconder que hay más", async () => {
    await con.db.insert(egreso).values(Array.from({ length: 51 }, () => ({ actorId, concepto: "Prueba de límite", importe: "1.00", fechaOperacion: "2020-01-20", claveSolicitud: randomUUID(), huella: "lectura" })))
    const r = await consulta().consultar(h, filtro)
    expect(r).toMatchObject({ resultado: "-46.00", hayMas: true })
    if (r.estado === "ok") expect(r.operaciones).toHaveLength(50)
  })
  it("mantiene snapshot REPEATABLE READ aunque una escritura externa se confirme entre fuentes", async () => {
    const original = lecturaVentas.resumirVentas
    const estados: unknown[] = []
    vi.spyOn(lecturaVentas, "resumirVentas").mockImplementationOnce(async (db, f) => {
      estados.push((await (db as NodePgDatabase).execute(sql`SELECT current_setting('transaction_isolation') AS aislamiento, current_setting('transaction_read_only') AS lectura`)).rows[0])
      const r = await original(db, f)
      await con.db.insert(compra).values({ actorId, total: "20.00", fechaOperacion: "2020-01-20", claveSolicitud: randomUUID(), huella: "concurrencia" })
      return r
    })
    expect(await consulta().consultar(h, filtro)).toMatchObject({ resultado: "5.00" })
    expect(estados).toEqual([{ aislamiento: "repeatable read", lectura: "on" }])
    expect(await consulta().consultar(h, filtro)).toMatchObject({ resultado: "-15.00" })
  })
  it("un fallo SQL real de una fuente revierte su savepoint sin falsear las otras", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.spyOn(lecturaEgresos, "resumirEgresos").mockImplementationOnce(async db => {
      await (db as NodePgDatabase).execute(sql`SELECT 1/0`)
      throw Error("inalcanzable")
    })
    expect(await consulta().consultar(h, filtro)).toMatchObject({ resultado: null, fuentes: { ventas: { estado: "ok" }, compras: { estado: "ok" }, egresos: { estado: "error" } } })
    expect(await consulta().consultar(h, filtro)).toMatchObject({ resultado: "5.00" })
  })
  it("sin sesión no abre la transacción y filtros inválidos no llegan a SQL", async () => {
    const leer = vi.fn(crearLecturaFinanzas(con.db))
    await expect(crearConsultaFinanzas(async () => { throw new ErrorSesionRequerida() }, leer).consultar(h, filtro)).rejects.toBeInstanceOf(ErrorSesionRequerida)
    expect((await crearConsultaFinanzas(exigir, leer).consultar(h, { modo: "rango", desde: "2020-02-30", hasta: "2020-03-01" })).estado).toBe("datos_invalidos")
    expect(leer).not.toHaveBeenCalled()
  })
})
