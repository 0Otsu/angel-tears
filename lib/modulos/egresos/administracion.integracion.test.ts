import { randomUUID } from "node:crypto"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { eq, sql } from "drizzle-orm"
import { egreso } from "@/lib/infraestructura/esquemas/egreso"
import { crearConexionPruebas } from "@/pruebas/arnes-bd"
import { ErrorSesionRequerida, type ExigirAdministradora } from "@/lib/modulos/autenticacion/contrato"
import { crearAdministracionEgresos } from "./administracion"
import { resumirEgresos } from "./lectura"

describe("Egresos en PostgreSQL aislado", () => {
  let conexion: ReturnType<typeof crearConexionPruebas>
  const ACTOR = "actor-test-egresos"
  const headers = new Headers()
  const exigir: ExigirAdministradora = async () => ({ id: ACTOR, nombre: "Test Egresos", email: "egresos@test.invalid" })
  const servicio = () => crearAdministracionEgresos({ db: conexion.db, exigir })
  const entrada = (otros = {}) => ({ concepto: "Alquiler", importe: "100.10", fechaOperacion: "2026-11-10", claveSolicitud: randomUUID(), ...otros })
  const filas = () => conexion.db.select().from(egreso).where(eq(egreso.actorId, ACTOR))
  beforeAll(async () => {
    conexion = crearConexionPruebas()
    await conexion.db.execute(sql`INSERT INTO "user" (id,name,email) VALUES (${ACTOR},'Test Egresos','egresos@test.invalid') ON CONFLICT DO NOTHING`)
  })
  beforeEach(async () => { await conexion.db.delete(egreso).where(eq(egreso.actorId, ACTOR)) })
  afterAll(async () => {
    if (!conexion) return
    try { await conexion.db.delete(egreso).where(eq(egreso.actorId, ACTOR)); await conexion.db.execute(sql`DELETE FROM "user" WHERE id=${ACTOR}`) }
    finally { await conexion.pool.end() }
  })
  it("registra campos exactos, fecha de carga e historial sin stock", async () => {
    const r = await servicio().registrar(headers, entrada({ importe: "9999999999999999.99", nota: "Luz" }))
    expect(r.estado).toBe("ok")
    if (r.estado !== "ok") throw Error("registro fallido")
    expect(r.egreso).toMatchObject({ concepto: "Alquiler", importe: "9999999999999999.99", nota: "Luz", moneda: "ARS", fechaOperacion: "2026-11-10", estado: "CONFIRMADO", anuladoEn: null })
    expect(Number.isNaN(Date.parse(r.egreso.creadoEn))).toBe(false)
    expect(await servicio().detalle(headers, r.egreso.id)).toEqual({ estado: "ok", egreso: r.egreso })
    expect((await filas())[0]).toMatchObject({ actorId: ACTOR, importe: "9999999999999999.99" })
  })
  it("deduplica solicitudes concurrentes y normaliza fingerprint", async () => {
    const dato = entrada()
    const resultados = await Promise.all([servicio().registrar(headers, dato), servicio().registrar(headers, { ...dato, importe: "100.1" })])
    expect(resultados.every(r => r.estado === "ok")).toBe(true)
    expect(resultados.filter(r => r.estado === "ok" && !r.repetido)).toHaveLength(1)
    expect(await filas()).toHaveLength(1)
    expect(await servicio().registrar(headers, { ...dato, importe: "200" })).toEqual({ estado: "conflicto_solicitud" })
    expect((await filas())[0].importe).toBe("100.10")
  })
  it("anula una sola vez aun concurrente y conserva importe e historia", async () => {
    const dato = entrada(), r = await servicio().registrar(headers, dato)
    if (r.estado !== "ok") throw Error("registro")
    const resultados = await Promise.all([servicio().anular(headers, r.egreso.id), servicio().anular(headers, r.egreso.id)])
    expect(resultados.map(x => x.estado).sort()).toEqual(["ok", "ya_anulado"])
    const [persistido] = await filas()
    expect(persistido).toMatchObject({ estado: "ANULADO", importe: "100.10", anuladoPorId: ACTOR })
    expect(persistido.anuladoEn).toBeInstanceOf(Date)
    expect((await servicio().registrar(headers, dato)).estado).toBe("ok")
    expect(await filas()).toHaveLength(1)
    expect((await filas())[0].estado).toBe("ANULADO")
  })
  it("filtros y resumen exacto usan fecha comercial, excluyen anulados y no duplican compras", async () => {
    const a = await servicio().registrar(headers, entrada({ importe: "0.10", fechaOperacion: "2020-01-01" }))
    await servicio().registrar(headers, entrada({ importe: "0.20", fechaOperacion: "2020-01-31" }))
    await servicio().registrar(headers, entrada({ importe: "99", fechaOperacion: "2020-02-01" }))
    expect(await servicio().resumir(headers, { desde: "2020-01-01", hasta: "2020-01-31" })).toEqual({ estado: "ok", resumen: { desde: "2020-01-01", hasta: "2020-01-31", vigentes: { cantidad: 2, total: "0.30" }, anuladas: { cantidad: 0 } } })
    if (a.estado !== "ok") throw Error("registro")
    await servicio().anular(headers, a.egreso.id)
    const resumen = await servicio().resumir(headers, { desde: "2020-01-01", hasta: "2020-01-31" })
    expect(resumen).toMatchObject({ estado: "ok", resumen: { vigentes: { cantidad: 1, total: "0.20" }, anuladas: { cantidad: 1 } } })
    const listado = await servicio().listar(headers, { estado: "ANULADO", desde: "2020-01-01", hasta: "2020-01-31", limite: 1 })
    expect(listado.estado).toBe("ok")
    if (listado.estado === "ok") { expect(listado.egresos).toHaveLength(1); expect(listado.egresos[0].id).toBe(a.egreso.id) }
  })
  it("sin datos suma cero, pagina sin truncar silenciosamente y valida filtros", async () => {
    expect(await servicio().resumir(headers, { desde: "1900-01-01", hasta: "1900-01-02" })).toMatchObject({ estado: "ok", resumen: { vigentes: { cantidad: 0, total: "0.00" } } })
    await servicio().registrar(headers, entrada())
    await servicio().registrar(headers, entrada())
    expect(await servicio().listar(headers, { limite: 1 })).toMatchObject({ estado: "ok", hayMas: true })
    expect(await servicio().listar(headers, { estado: "SQL" })).toMatchObject({ estado: "datos_invalidos" })
    expect(await servicio().resumir(headers, { desde: "2026-11-11", hasta: "2026-11-10" })).toMatchObject({ estado: "datos_invalidos" })
  })
  it("no escribe otras fuentes y el resumen admite transaccion del consumidor", async () => {
    const conteos = async () => (await conexion.db.execute(sql`SELECT
      (SELECT count(*)::int FROM compra) AS compras,
      (SELECT count(*)::int FROM venta) AS ventas,
      (SELECT count(*)::int FROM movimiento_stock) AS movimientos,
      (SELECT coalesce(sum(cantidad),0)::text FROM inventario) AS saldo`)).rows
    const antes = await conteos()
    const r = await servicio().registrar(headers, entrada({ fechaOperacion: "1901-01-01", importe: "3.25" }))
    const resumen = await conexion.db.transaction(tx => resumirEgresos(tx, { desde: "1901-01-01", hasta: "1901-01-01" }))
    expect(resumen).toMatchObject({ estado: "ok", resumen: { vigentes: { cantidad: 1, total: "3.25" } } })
    if (r.estado !== "ok") throw Error("registro")
    await servicio().anular(headers, r.egreso.id)
    expect(await conteos()).toEqual(antes)
  })
  it("no ejecuta comandos ni lecturas sin sesion", async () => {
    const sinSesion = crearAdministracionEgresos({ db: conexion.db, exigir: async () => { throw new ErrorSesionRequerida() } })
    expect(await sinSesion.registrar(headers, entrada())).toEqual({ estado: "sesion_requerida" })
    expect(await sinSesion.anular(headers, randomUUID())).toEqual({ estado: "sesion_requerida" })
    expect(await sinSesion.detalle(headers, randomUUID())).toEqual({ estado: "sesion_requerida" })
    await expect(sinSesion.listar(headers)).rejects.toThrow(ErrorSesionRequerida)
    await expect(sinSesion.resumir(headers)).rejects.toThrow(ErrorSesionRequerida)
    expect(await filas()).toHaveLength(0)
  })
  it("errores de entrada no escriben; IDs desconocidos son esperados", async () => {
    expect(await servicio().registrar(headers, entrada({ importe: "0.001" }))).toMatchObject({ estado: "datos_invalidos" })
    expect(await servicio().registrar(headers, entrada({ importe: "0" }))).toMatchObject({ estado: "datos_invalidos" })
    expect(await servicio().detalle(headers, "mal")).toEqual({ estado: "no_encontrado" })
    expect(await servicio().anular(headers, randomUUID())).toEqual({ estado: "no_encontrado" })
    expect(await filas()).toHaveLength(0)
  })
  it("un fallo de FK revierte el registro, y checks respaldan invariantes", async () => {
    const otro = crearAdministracionEgresos({ db: conexion.db, exigir: async () => ({ id: "no-existe-egresos", nombre: "Test", email: "test@test.invalid" }) })
    await expect(otro.registrar(headers, entrada())).rejects.toThrow()
    expect(await filas()).toHaveLength(0)
    for (const importe of ["0", "-1", "NaN"]) await expect(conexion.db.insert(egreso).values({ concepto: "Test", importe, fechaOperacion: "2026-11-10", actorId: ACTOR, claveSolicitud: randomUUID(), huella: "h" })).rejects.toThrow()
  })
})
