import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { eq, inArray, sql } from "drizzle-orm"
import type { ConexionBd } from "@/lib/infraestructura/conexion-bd"
import { ajusteStock, inventario, movimientoStock } from "@/lib/infraestructura/esquemas/inventario"
import { producto } from "@/lib/infraestructura/esquemas/producto"
import { venta, ventaLinea } from "@/lib/infraestructura/esquemas/venta"
import { crearContratoInventario } from "@/lib/modulos/inventario/persistencia"
import { insertarProductoOcultoConSaldo, sembrarCategorias } from "@/lib/modulos/productos/persistencia"
import { anularVenta } from "@/lib/modulos/ventas/anulacion"
import type { ComandoRegistrarVenta, ResultadoRegistroVenta } from "@/lib/modulos/ventas/contrato"
import { listarVentas, obtenerVenta, resumirVentas } from "@/lib/modulos/ventas/lectura"
import { registrarVenta } from "@/lib/modulos/ventas/registro"
import { crearConexionPruebas } from "@/pruebas/arnes-bd"

// Anulacion y consulta de ventas contra PostgreSQL real (change implement-sales, 4.1, 4.2 y 4.3):
// reintegro unico, historia conservada, concurrencia con otras ventas y filtros por fecha de
// operacion.

const ACTOR = "usuario-prueba-anulacion-venta"
const PRODUCTO_A = "a4040404-4040-4404-8404-404040404040"
const PRODUCTO_B = "b5050505-5050-4505-8505-505050505050"

describe("anulacion y consulta de ventas sobre PostgreSQL", () => {
  let conexion: ConexionBd | undefined

  function db() {
    if (!conexion) throw new Error("La conexion de pruebas no esta disponible.")
    return conexion.db
  }
  const contrato = () => crearContratoInventario(db())

  const leerProductos = (ids: readonly string[]) =>
    db()
      .select({ id: producto.id, nombre: producto.nombre, precio: producto.precio })
      .from(producto)
      .where(inArray(producto.id, [...ids]))

  async function limpiar() {
    await db().delete(movimientoStock)
    await db().delete(ajusteStock)
    await db().delete(ventaLinea)
    await db().delete(venta)
    await db().delete(inventario)
    await db().delete(producto).where(inArray(producto.id, [PRODUCTO_A, PRODUCTO_B]))
  }

  async function saldoDe(id: string): Promise<number> {
    const [fila] = await db().select().from(inventario).where(eq(inventario.productoId, id))
    return fila.cantidad
  }

  async function fijarSaldo(id: string, cantidad: number) {
    await db().update(inventario).set({ cantidad }).where(eq(inventario.productoId, id))
  }

  function comando(cambios: Partial<ComandoRegistrarVenta> = {}): ComandoRegistrarVenta {
    return {
      claveSolicitud: crypto.randomUUID(),
      fechaOperacion: "2026-11-05",
      lineas: [{ productoId: PRODUCTO_A, cantidad: 2 }],
      actorId: ACTOR,
      ...cambios,
    }
  }

  const registrar = (cmd: ComandoRegistrarVenta) => registrarVenta(db(), contrato(), leerProductos, cmd)
  const anular = (ventaId: string) => anularVenta(db(), contrato(), { ventaId, actorId: ACTOR })

  async function venderOk(cambios: Partial<ComandoRegistrarVenta> = {}) {
    const resultado: ResultadoRegistroVenta = await registrar(comando(cambios))
    if (resultado.estado !== "ok") throw new Error(`Se esperaba ok y llego ${resultado.estado}`)
    return resultado.venta
  }

  beforeAll(async () => {
    conexion = crearConexionPruebas()
    await db().transaction(sembrarCategorias)
    await db().execute(sql`
      INSERT INTO "user" (id, name, email) VALUES (${ACTOR}, 'Prueba', 'prueba-anulacion-venta@ejemplo.com')
      ON CONFLICT (id) DO NOTHING`)
  })

  beforeEach(async () => {
    await limpiar()
    for (const [id, nombre, precio] of [[PRODUCTO_A, "Collar de plata", "10.10"], [PRODUCTO_B, "Pulsera", "0.10"]]) {
      await db().transaction(async (tx) => {
        await insertarProductoOcultoConSaldo(
          tx, id, { nombre, precio, categoriaCodigo: "collares" }, contrato().crearSaldoCero,
        )
      })
    }
    await fijarSaldo(PRODUCTO_A, 5)
    await fijarSaldo(PRODUCTO_B, 5)
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

  describe("anular (4.2)", () => {
    it("reintegra todas las lineas, conserva la venta y deja reversas ligadas a los originales", async () => {
      const original = await venderOk({
        lineas: [{ productoId: PRODUCTO_A, cantidad: 2 }, { productoId: PRODUCTO_B, cantidad: 3 }],
      })

      const resultado = await anular(original.id)

      expect(resultado.estado).toBe("ok")
      if (resultado.estado !== "ok") return
      expect(resultado.venta).toMatchObject({ id: original.id, estado: "ANULADA", total: original.total })
      expect(resultado.venta.anuladoEn).not.toBeNull()
      expect(resultado.venta.lineas).toEqual(original.lineas)
      expect(resultado.productosAfectados.slice().sort()).toEqual([PRODUCTO_A, PRODUCTO_B])
      expect(await saldoDe(PRODUCTO_A)).toBe(5)
      expect(await saldoDe(PRODUCTO_B)).toBe(5)

      const [cabecera] = await db().select().from(venta).where(eq(venta.id, original.id))
      expect(cabecera).toMatchObject({ estado: "ANULADA", anuladoPorId: ACTOR })
      const movimientos = await db().select().from(movimientoStock)
      const originales = movimientos.filter((m) => m.tipo === "ORIGINAL")
      const reversas = movimientos.filter((m) => m.tipo === "REVERSA")
      expect(originales).toHaveLength(2)
      expect(reversas).toHaveLength(2)
      expect(reversas.map((r) => r.reversaDe).sort()).toEqual(originales.map((o) => o.id).sort())
      expect(reversas.map((r) => r.ventaLineaId).sort()).toEqual(originales.map((o) => o.ventaLineaId).sort())
    })

    it("una segunda anulacion informa que ya estaba anulada y no reintegra otra vez", async () => {
      const original = await venderOk()
      await anular(original.id)

      const segunda = await anular(original.id)

      expect(segunda.estado).toBe("ya_anulada")
      expect(await saldoDe(PRODUCTO_A)).toBe(5)
      expect(await db().select().from(movimientoStock).where(eq(movimientoStock.tipo, "REVERSA"))).toHaveLength(1)
    })

    it("informa una venta inexistente o un ID mal formado sin tocar nada", async () => {
      expect(await anular("c6060606-6060-4606-8606-606060606060")).toEqual({ estado: "no_encontrada" })
      expect(await obtenerVenta(db(), "no-es-uuid")).toEqual({ estado: "no_encontrada" })
    })

    it("tres anulaciones simultaneas de la misma venta reintegran una sola vez", async () => {
      const original = await venderOk({ lineas: [{ productoId: PRODUCTO_A, cantidad: 3 }] })

      const resultados = await Promise.all([anular(original.id), anular(original.id), anular(original.id)])

      expect(resultados.filter((r) => r.estado === "ok")).toHaveLength(1)
      expect(resultados.filter((r) => r.estado === "ya_anulada")).toHaveLength(2)
      expect(await saldoDe(PRODUCTO_A)).toBe(5)
      expect(await db().select().from(movimientoStock).where(eq(movimientoStock.tipo, "REVERSA"))).toHaveLength(1)
    })
  })

  describe("anular junto con otra venta (4.3)", () => {
    it("anular y vender el mismo producto a la vez deja el stock exacto, sea cual sea el orden", async () => {
      await fijarSaldo(PRODUCTO_A, 5)
      const primera = await venderOk({ lineas: [{ productoId: PRODUCTO_A, cantidad: 5 }] })
      expect(await saldoDe(PRODUCTO_A)).toBe(0)

      const [anulacion, nueva] = await Promise.all([
        anular(primera.id),
        registrar(comando({ lineas: [{ productoId: PRODUCTO_A, cantidad: 5 }] })),
      ])

      expect(anulacion.estado).toBe("ok")
      // Si la nueva venta corrio antes del reintegro no habia stock; si corrio despues, lo uso.
      expect(["ok", "stock_insuficiente"]).toContain(nueva.estado)
      expect(await saldoDe(PRODUCTO_A)).toBe(nueva.estado === "ok" ? 0 : 5)
      const [fila] = await db()
        .select({ neto: sql<number>`sum(${movimientoStock.delta})::int` })
        .from(movimientoStock)
      expect(fila.neto).toBe((await saldoDe(PRODUCTO_A)) - 5)
    })

    it("varias anulaciones y ventas cruzadas simultaneas no producen deadlock ni saldos negativos", async () => {
      const ventas = await Promise.all(
        [1, 2].map(() => venderOk({ lineas: [{ productoId: PRODUCTO_A, cantidad: 1 }, { productoId: PRODUCTO_B, cantidad: 1 }] })),
      )
      const ba = () => comando({ lineas: [{ productoId: PRODUCTO_B, cantidad: 1 }, { productoId: PRODUCTO_A, cantidad: 1 }] })

      const resultados = await Promise.all([
        anular(ventas[0].id), anular(ventas[1].id), registrar(ba()), registrar(ba()),
      ])

      expect(resultados.every((r) => r.estado === "ok")).toBe(true)
      expect(await saldoDe(PRODUCTO_A)).toBe(3)
      expect(await saldoDe(PRODUCTO_B)).toBe(3)
    })
  })

  describe("consultar (4.1)", () => {
    // Estos casos registran varias ventas: se necesita stock de sobra.
    beforeEach(async () => {
      await fijarSaldo(PRODUCTO_A, 100)
      await fijarSaldo(PRODUCTO_B, 100)
    })

    it("ordena por fecha de operacion y no por fecha de carga, y muestra Consumidor Final como comprador nulo", async () => {
      const reciente = await venderOk({ fechaOperacion: "2026-11-08" })
      const antigua = await venderOk({ fechaOperacion: "2026-10-01", comprador: "Ana" })
      const intermedia = await venderOk({ fechaOperacion: "2026-10-15" })

      const resultado = await listarVentas(db())

      expect(resultado.estado).toBe("ok")
      if (resultado.estado !== "ok") return
      expect(resultado.ventas.map((v) => v.id)).toEqual([reciente.id, intermedia.id, antigua.id])
      expect(resultado.ventas.map((v) => v.comprador)).toEqual([null, null, "Ana"])
      expect(resultado.ventas[0]).toMatchObject({ cantidadLineas: 1, total: "20.20", estado: "CONFIRMADA" })
      expect(resultado.hayMas).toBe(false)
    })

    it("filtra por rango inclusivo de fecha de operacion y por estado, anuladas incluidas", async () => {
      const a = await venderOk({ fechaOperacion: "2026-10-01" })
      const b = await venderOk({ fechaOperacion: "2026-10-15" })
      const c = await venderOk({ fechaOperacion: "2026-11-01" })
      await anular(b.id)

      const rango = await listarVentas(db(), { desde: "2026-10-01", hasta: "2026-10-15" })
      const anuladas = await listarVentas(db(), { estado: "ANULADA" })
      const vigentes = await listarVentas(db(), { estado: "CONFIRMADA" })

      expect(rango.estado === "ok" && rango.ventas.map((v) => v.id)).toEqual([b.id, a.id])
      expect(anuladas.estado === "ok" && anuladas.ventas.map((v) => v.id)).toEqual([b.id])
      expect(vigentes.estado === "ok" && vigentes.ventas.map((v) => v.id)).toEqual([c.id, a.id])
    })

    it("un estado vacio muestra el listado sin ventas como estado vacio, no como error", async () => {
      expect(await listarVentas(db())).toEqual({ estado: "ok", ventas: [], hayMas: false })
    })

    it("pagina con limite e indica si hay mas", async () => {
      await venderOk({ fechaOperacion: "2026-11-01" })
      await venderOk({ fechaOperacion: "2026-11-02" })
      await venderOk({ fechaOperacion: "2026-11-03" })

      const resultado = await listarVentas(db(), { limite: "2" })

      expect(resultado.estado === "ok" && resultado.ventas).toHaveLength(2)
      expect(resultado.estado === "ok" && resultado.hayMas).toBe(true)
    })

    it("rechaza filtros invalidos sin consultar", async () => {
      const resultado = await listarVentas(db(), { estado: "BORRADOR", desde: "ayer", hasta: "2026-02-30", limite: 0 })

      expect(resultado).toEqual({
        estado: "datos_invalidos",
        errores: {
          desde: "Ingresá una fecha válida.",
          hasta: "Ingresá una fecha válida.",
          estado: "Elegí un estado válido.",
          limite: "Ingresá un límite entre 1 y 200.",
        },
      })
      expect(await listarVentas(db(), { desde: "2026-11-02", hasta: "2026-11-01" })).toMatchObject({
        estado: "datos_invalidos", errores: { hasta: "La fecha final no puede ser anterior a la inicial." },
      })
    })

    it("devuelve el detalle con sus lineas historicas", async () => {
      const original = await venderOk({ lineas: [{ productoId: PRODUCTO_A, cantidad: 1 }, { productoId: PRODUCTO_B, cantidad: 2 }] })
      await db().update(producto).set({ precio: "99.00" }).where(eq(producto.id, PRODUCTO_A))

      const detalle = await obtenerVenta(db(), original.id)

      expect(detalle).toEqual({ estado: "ok", venta: original })
    })
  })

  describe("resumen de ventas vigentes (Dashboard y Finanzas)", () => {
    beforeEach(async () => {
      await fijarSaldo(PRODUCTO_A, 100)
      await fijarSaldo(PRODUCTO_B, 100)
    })

    it("suma solo las vigentes por fecha de operacion y cuenta aparte las anuladas", async () => {
      await venderOk({ fechaOperacion: "2026-10-10", lineas: [{ productoId: PRODUCTO_A, cantidad: 1 }] }) // 10.10
      const anulada = await venderOk({ fechaOperacion: "2026-10-11", lineas: [{ productoId: PRODUCTO_A, cantidad: 2 }] })
      await venderOk({ fechaOperacion: "2026-10-12", lineas: [{ productoId: PRODUCTO_B, cantidad: 3 }] }) // 0.30
      await venderOk({ fechaOperacion: "2026-12-01", lineas: [{ productoId: PRODUCTO_B, cantidad: 1 }] }) // fuera del rango
      await anular(anulada.id)

      const resultado = await resumirVentas(db(), { desde: "2026-10-01", hasta: "2026-10-31" })

      expect(resultado).toEqual({
        estado: "ok",
        resumen: {
          desde: "2026-10-01", hasta: "2026-10-31",
          vigentes: { cantidad: 2, total: "10.40" },
          anuladas: { cantidad: 1 },
        },
      })
    })

    it("un periodo sin ventas devuelve ceros exactos y un rango invalido se rechaza", async () => {
      expect(await resumirVentas(db(), { desde: "2026-01-01", hasta: "2026-01-31" })).toEqual({
        estado: "ok",
        resumen: { desde: "2026-01-01", hasta: "2026-01-31", vigentes: { cantidad: 0, total: "0.00" }, anuladas: { cantidad: 0 } },
      })
      expect(await resumirVentas(db(), { desde: "x" })).toEqual({
        estado: "datos_invalidos", errores: { desde: "Ingresá una fecha válida." },
      })
    })
  })
})
