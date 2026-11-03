import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { eq, inArray, sql } from "drizzle-orm"
import type { ConexionBd } from "@/lib/infraestructura/conexion-bd"
import { ajusteStock, inventario, movimientoStock } from "@/lib/infraestructura/esquemas/inventario"
import { producto } from "@/lib/infraestructura/esquemas/producto"
import { ErrorSesionRequerida, type ExigirAdministradora } from "@/lib/modulos/autenticacion/contrato"
import { crearAdministracionInventario } from "@/lib/modulos/inventario/administracion"
import { crearContratoInventario } from "@/lib/modulos/inventario/persistencia"
import { insertarProductoOcultoConSaldo, sembrarCategorias } from "@/lib/modulos/productos/persistencia"
import { crearConexionPruebas } from "@/pruebas/arnes-bd"

// Administracion de Inventario contra PostgreSQL real (tareas 2.1, 2.2 y 2.5): listado con
// estados, ajustes por la ruta administrativa, cambio de minimo e historial, siempre con la
// Administradora exigida en el servidor.

const ACTOR = "usuario-prueba-admin-inventario"
const PRODUCTO_A = "a3333333-3333-4333-8333-333333333333"
const PRODUCTO_B = "b4444444-4444-4444-8444-444444444444"
const PRODUCTO_C = "c5555555-5555-4555-8555-555555555555"
const IDS = [PRODUCTO_A, PRODUCTO_B, PRODUCTO_C]

const encabezados = new Headers()
const conSesion: ExigirAdministradora = async () => ({ id: ACTOR, nombre: "Administradora de prueba", email: "admin-inventario@ejemplo.com" })
const sinSesion: ExigirAdministradora = async () => { throw new ErrorSesionRequerida() }

describe("administracion de inventario sobre PostgreSQL", () => {
  let conexion: ConexionBd | undefined
  const db = () => {
    if (!conexion) throw new Error("La conexion de pruebas no esta disponible.")
    return conexion.db
  }
  const administracion = (exigir: ExigirAdministradora = conSesion) =>
    crearAdministracionInventario({ db: db(), exigir, contrato: crearContratoInventario(db()) })

  async function limpiar() {
    await db().delete(movimientoStock).where(inArray(movimientoStock.productoId, IDS))
    await db().delete(ajusteStock).where(inArray(ajusteStock.productoId, IDS))
    await db().delete(inventario).where(inArray(inventario.productoId, IDS))
    await db().delete(producto).where(inArray(producto.id, IDS))
  }

  async function crearProducto(id: string, nombre: string) {
    await db().transaction((tx) =>
      insertarProductoOcultoConSaldo(tx, id, { nombre, precio: "10.00", categoriaCodigo: "collares" }, crearContratoInventario(db()).crearSaldoCero))
  }

  const fijar = (id: string, cantidad: number, minimo: number | null) =>
    db().update(inventario).set({ cantidad, minimo }).where(eq(inventario.productoId, id))
  const saldoDe = async (id: string) => (await db().select().from(inventario).where(eq(inventario.productoId, id)))[0]

  beforeAll(async () => {
    conexion = crearConexionPruebas()
    await db().transaction(sembrarCategorias)
    await db().execute(sql`
      INSERT INTO "user" (id, name, email) VALUES (${ACTOR}, 'Administradora de prueba', 'admin-inventario@ejemplo.com')
      ON CONFLICT (id) DO NOTHING`)
  })
  beforeEach(async () => {
    await limpiar()
    await crearProducto(PRODUCTO_A, "Anillo")
    await crearProducto(PRODUCTO_B, "Brazalete")
    await crearProducto(PRODUCTO_C, "Collar")
  })
  afterEach(limpiar)
  afterAll(async () => {
    if (!conexion) return
    try {
      await limpiar()
      await db().execute(sql`DELETE FROM "user" WHERE id = ${ACTOR}`)
    } finally {
      await conexion.pool.end()
    }
  })

  describe("consultar", () => {
    it("clasifica stock bajo (<=), sin stock y sin minimo, ordenado por nombre", async () => {
      await fijar(PRODUCTO_A, 5, 5) // igualdad: bajo
      await fijar(PRODUCTO_B, 0, null) // agotado sin minimo: sin stock, no bajo
      await fijar(PRODUCTO_C, 0, 0) // cero es un minimo real: bajo y sin stock

      const { filas } = await administracion().consultar(encabezados)
      const mios = filas.filter((f) => IDS.includes(f.productoId))

      expect(mios.map((f) => [f.nombre, f.saldo, f.minimo, f.stockBajo, f.sinStock])).toEqual([
        ["Anillo", 5, 5, true, false],
        ["Brazalete", 0, null, false, true],
        ["Collar", 0, 0, true, true],
      ])
    })

    it("un saldo por encima del minimo no es stock bajo", async () => {
      await fijar(PRODUCTO_A, 6, 5)
      const { filas } = await administracion().consultar(encabezados)
      expect(filas.find((f) => f.productoId === PRODUCTO_A)).toMatchObject({ stockBajo: false, sinStock: false })
    })

    it("sin sesion rechaza la lectura", async () => {
      await expect(administracion(sinSesion).consultar(encabezados)).rejects.toBeInstanceOf(ErrorSesionRequerida)
    })
  })

  describe("ajustar", () => {
    const base = () => ({ productoId: PRODUCTO_A, claveSolicitud: crypto.randomUUID(), motivo: "Recuento" })

    it("suma con la cantidad como texto y registra actor y motivo", async () => {
      const r = await administracion().ajustar(encabezados, { ...base(), tipo: "INCREMENTO", cantidad: "7" })

      expect(r).toEqual({ estado: "ok", saldoResultante: 7, repetido: false })
      expect((await saldoDe(PRODUCTO_A)).cantidad).toBe(7)
      const [mov] = await db().select().from(movimientoStock).where(eq(movimientoStock.productoId, PRODUCTO_A))
      expect(mov).toMatchObject({ delta: 7, actorId: ACTOR })
    })

    it("rechaza un decremento insuficiente sin dejar efectos", async () => {
      const r = await administracion().ajustar(encabezados, { ...base(), tipo: "DECREMENTO", cantidad: "1" })

      expect(r).toEqual({ estado: "stock_insuficiente", disponible: 0, requerido: 1 })
      expect((await saldoDe(PRODUCTO_A)).cantidad).toBe(0)
      expect(await db().select().from(ajusteStock).where(eq(ajusteStock.productoId, PRODUCTO_A))).toHaveLength(0)
    })

    it.each(["0", "-1", "1.5", "abc", ""])("rechaza la cantidad %j con mensaje por campo", async (cantidad) => {
      const r = await administracion().ajustar(encabezados, { ...base(), tipo: "INCREMENTO", cantidad })
      expect(r).toMatchObject({ estado: "datos_invalidos", errores: { cantidad: expect.any(String) } })
    })

    it("exige motivo y rechaza claves o productos que no son UUID", async () => {
      const sinMotivo = await administracion().ajustar(encabezados, { ...base(), motivo: "  ", tipo: "INCREMENTO", cantidad: "1" })
      expect(sinMotivo).toMatchObject({ estado: "datos_invalidos", errores: { motivo: expect.any(String) } })
      const claveMala = await administracion().ajustar(encabezados, { ...base(), claveSolicitud: "x", tipo: "INCREMENTO", cantidad: "1" })
      expect(claveMala).toMatchObject({ estado: "datos_invalidos", errores: { claveSolicitud: expect.any(String) } })
      const productoMalo = await administracion().ajustar(encabezados, { ...base(), productoId: "x", tipo: "INCREMENTO", cantidad: "1" })
      expect(productoMalo).toMatchObject({ estado: "datos_invalidos", errores: { productoId: expect.any(String) } })
    })

    it("repetir la misma solicitud no suma dos veces y otro contenido con la misma clave es conflicto", async () => {
      const entrada = { ...base(), tipo: "INCREMENTO", cantidad: "3" }
      await administracion().ajustar(encabezados, entrada)

      expect(await administracion().ajustar(encabezados, entrada)).toEqual({ estado: "ok", saldoResultante: 3, repetido: true })
      expect(await administracion().ajustar(encabezados, { ...entrada, cantidad: "4" })).toEqual({ estado: "conflicto_solicitud" })
      expect((await saldoDe(PRODUCTO_A)).cantidad).toBe(3)
    })

    it("sin sesion no ejecuta nada", async () => {
      const r = await administracion(sinSesion).ajustar(encabezados, { ...base(), tipo: "INCREMENTO", cantidad: "3" })

      expect(r).toEqual({ estado: "sesion_requerida" })
      expect((await saldoDe(PRODUCTO_A)).cantidad).toBe(0)
      expect(await db().select().from(ajusteStock).where(eq(ajusteStock.productoId, PRODUCTO_A))).toHaveLength(0)
    })
  })

  describe("cambiarMinimo", () => {
    it("configura, quita y acepta cero sin tocar saldo ni movimientos", async () => {
      await fijar(PRODUCTO_A, 4, null)

      expect(await administracion().cambiarMinimo(encabezados, { productoId: PRODUCTO_A, minimo: "5" })).toEqual({ estado: "ok", minimo: 5 })
      expect(await administracion().cambiarMinimo(encabezados, { productoId: PRODUCTO_A, minimo: "0" })).toEqual({ estado: "ok", minimo: 0 })
      expect(await administracion().cambiarMinimo(encabezados, { productoId: PRODUCTO_A, minimo: "" })).toEqual({ estado: "ok", minimo: null })

      const fila = await saldoDe(PRODUCTO_A)
      expect(fila).toMatchObject({ cantidad: 4, minimo: null })
      expect(await db().select().from(movimientoStock).where(eq(movimientoStock.productoId, PRODUCTO_A))).toHaveLength(0)
    })

    it.each(["-1", "1.5", "abc", "1e3"])("rechaza el minimo %j y conserva el valor", async (minimo) => {
      await fijar(PRODUCTO_A, 4, 2)

      const r = await administracion().cambiarMinimo(encabezados, { productoId: PRODUCTO_A, minimo })

      expect(r).toMatchObject({ estado: "datos_invalidos", errores: { minimo: expect.any(String) } })
      expect((await saldoDe(PRODUCTO_A)).minimo).toBe(2)
    })

    it("informa producto inexistente y exige sesion", async () => {
      expect(await administracion().cambiarMinimo(encabezados, { productoId: crypto.randomUUID(), minimo: "1" })).toEqual({ estado: "no_encontrado" })
      expect(await administracion(sinSesion).cambiarMinimo(encabezados, { productoId: PRODUCTO_A, minimo: "1" })).toEqual({ estado: "sesion_requerida" })
      expect((await saldoDe(PRODUCTO_A)).minimo).toBeNull()
    })
  })

  describe("historial", () => {
    it("lista los movimientos del mas nuevo al mas viejo con motivo, actor y saldo", async () => {
      const a = administracion()
      await a.ajustar(encabezados, { productoId: PRODUCTO_A, claveSolicitud: crypto.randomUUID(), tipo: "INICIAL", cantidad: "10", motivo: "Existencias previas" })
      await a.ajustar(encabezados, { productoId: PRODUCTO_A, claveSolicitud: crypto.randomUUID(), tipo: "DECREMENTO", cantidad: "4", motivo: "Rotura" })

      const r = await a.historial(encabezados, PRODUCTO_A)

      expect(r.estado).toBe("ok")
      if (r.estado !== "ok") return
      expect(r.movimientos.map((m) => [m.tipoAjuste, m.delta, m.saldoResultante, m.motivo, m.actor])).toEqual([
        ["DECREMENTO", -4, 6, "Rotura", "Administradora de prueba"],
        ["INICIAL", 10, 10, "Existencias previas", "Administradora de prueba"],
      ])
    })

    it("un producto sin movimientos devuelve lista vacia; uno inexistente, no_encontrado", async () => {
      expect(await administracion().historial(encabezados, PRODUCTO_B)).toEqual({ estado: "ok", movimientos: [] })
      expect(await administracion().historial(encabezados, crypto.randomUUID())).toEqual({ estado: "no_encontrado" })
      expect(await administracion().historial(encabezados, "no-uuid")).toEqual({ estado: "no_encontrado" })
    })

    it("sin sesion no entrega datos", async () => {
      expect(await administracion(sinSesion).historial(encabezados, PRODUCTO_A)).toEqual({ estado: "sesion_requerida" })
    })
  })
})
