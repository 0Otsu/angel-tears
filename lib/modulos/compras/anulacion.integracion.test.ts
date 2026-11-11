import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { eq } from "drizzle-orm"
import type { ConexionBd } from "@/lib/infraestructura/conexion-bd"
import { compra } from "@/lib/infraestructura/esquemas/compra"
import { movimientoStock } from "@/lib/infraestructura/esquemas/inventario"
import { anularCompra } from "@/lib/modulos/compras/anulacion"
import type { CompraDetalle } from "@/lib/modulos/compras/contrato"
import { registrarCompra } from "@/lib/modulos/compras/registro"
import { registrarAjuste } from "@/lib/modulos/inventario/ajustes"
import { ACTOR_COMPRAS, crearArnesCompras } from "@/pruebas/arnes-compras"
import { crearConexionPruebas } from "@/pruebas/arnes-bd"

// Anulacion de compras contra PostgreSQL real (tareas 4.3 y 4.4): reversion unica, todo o nada,
// y concurrencia con otras operaciones de stock. Los dobles en memoria no prueban nada de esto.

const PRODUCTO_A = "c3333333-3333-4333-8333-333333333333"
const PRODUCTO_B = "c4444444-4444-4444-8444-444444444444"

describe("anulacion de compras sobre PostgreSQL", () => {
  let conexion: ConexionBd | undefined
  const arnes = crearArnesCompras(() => {
    if (!conexion) throw new Error("La conexion de pruebas no esta disponible.")
    return conexion
  }, [PRODUCTO_A, PRODUCTO_B])

  async function comprar(lineas: { productoId: string; cantidad: number; costoUnitario: string }[]): Promise<CompraDetalle> {
    const r = await registrarCompra(arnes.db(), arnes.contrato(), arnes.leerProductos, {
      claveSolicitud: crypto.randomUUID(), fechaOperacion: "2026-11-03", lineas, actorId: ACTOR_COMPRAS,
    })
    if (r.estado !== "ok") throw new Error(`Se esperaba ok y fue ${r.estado}`)
    return r.compra
  }
  const anular = (compraId: string) => anularCompra(arnes.db(), arnes.contrato(), arnes.leerProductos, { compraId, actorId: ACTOR_COMPRAS })
  const decrementar = (productoId: string, cantidad: number) =>
    registrarAjuste(arnes.db(), arnes.contrato(), {
      claveSolicitud: crypto.randomUUID(), productoId, tipo: "DECREMENTO", cantidad, motivo: "Consumo de prueba", actorId: ACTOR_COMPRAS,
    })
  const estadoDe = async (id: string) => (await arnes.db().select().from(compra).where(eq(compra.id, id)))[0]
  const movimientosDe = (id: string) => arnes.db().select().from(movimientoStock).where(eq(movimientoStock.productoId, id))

  beforeAll(async () => {
    conexion = crearConexionPruebas()
    await arnes.preparar()
  })
  beforeEach(async () => {
    await arnes.limpiar()
    await arnes.crearProducto(PRODUCTO_A, "Producto A")
    await arnes.crearProducto(PRODUCTO_B, "Producto B")
  })
  afterEach(arnes.limpiar)
  afterAll(async () => {
    if (!conexion) return
    try {
      await arnes.limpiar()
      await arnes.quitarUsuario()
    } finally {
      await conexion.pool.end()
    }
  })

  it("anula la compra, revierte el stock una vez y conserva la compra con su historia", async () => {
    await arnes.fijarSaldo(PRODUCTO_A, 1)
    const c = await comprar([
      { productoId: PRODUCTO_A, cantidad: 4, costoUnitario: "10" },
      { productoId: PRODUCTO_B, cantidad: 2, costoUnitario: "5" },
    ])
    expect(await arnes.saldoDe(PRODUCTO_A)).toBe(5)

    const r = await anular(c.id)

    expect(r.estado).toBe("ok")
    if (r.estado !== "ok") return
    expect(r.compra).toMatchObject({ id: c.id, estado: "ANULADA", total: c.total })
    expect(r.compra.anuladoEn).not.toBeNull()
    expect(r.compra.lineas).toEqual(c.lineas)
    expect([...r.productosAfectados].sort()).toEqual([PRODUCTO_A, PRODUCTO_B])
    expect(await arnes.saldoDe(PRODUCTO_A)).toBe(1)
    expect(await arnes.saldoDe(PRODUCTO_B)).toBe(0)
    const movimientos = await movimientosDe(PRODUCTO_A)
    expect(movimientos.map((m) => [m.tipo, m.delta]).sort()).toEqual([["ORIGINAL", 4], ["REVERSA", -4]])
    const reversa = movimientos.find((m) => m.tipo === "REVERSA")!
    const original = movimientos.find((m) => m.tipo === "ORIGINAL")!
    expect(reversa).toMatchObject({ reversaDe: original.id, compraLineaId: original.compraLineaId })
  })

  it("una segunda anulacion devuelve el registro actual sin revertir otra vez", async () => {
    const c = await comprar([{ productoId: PRODUCTO_A, cantidad: 3, costoUnitario: "10" }])
    await anular(c.id)
    const anuladoEn = (await estadoDe(c.id)).anuladoEn

    const r = await anular(c.id)

    expect(r).toMatchObject({ estado: "ya_anulada", compra: { id: c.id, estado: "ANULADA" } })
    expect(await arnes.saldoDe(PRODUCTO_A)).toBe(0)
    expect((await estadoDe(c.id)).anuladoEn).toEqual(anuladoEn)
    expect(await movimientosDe(PRODUCTO_A)).toHaveLength(2)
  })

  it("cuatro anulaciones simultaneas producen una sola reversion", async () => {
    await arnes.fijarSaldo(PRODUCTO_A, 2)
    const c = await comprar([{ productoId: PRODUCTO_A, cantidad: 6, costoUnitario: "10" }])

    const resultados = await Promise.all(Array.from({ length: 4 }, () => anular(c.id)))

    expect(resultados.filter((r) => r.estado === "ok")).toHaveLength(1)
    expect(resultados.filter((r) => r.estado === "ya_anulada")).toHaveLength(3)
    expect(await arnes.saldoDe(PRODUCTO_A)).toBe(2)
    expect((await movimientosDe(PRODUCTO_A)).filter((m) => m.tipo === "REVERSA")).toHaveLength(1)
  })

  it("si el stock comprado ya se consumio, rechaza toda la anulacion sin efectos parciales", async () => {
    const c = await comprar([
      { productoId: PRODUCTO_A, cantidad: 5, costoUnitario: "10" },
      { productoId: PRODUCTO_B, cantidad: 5, costoUnitario: "10" },
    ])
    // Se consumen 3 de B: revertir las 5 unidades de B dejaria saldo negativo; A si alcanzaria.
    expect((await decrementar(PRODUCTO_B, 3)).estado).toBe("ok")

    const r = await anular(c.id)

    expect(r).toEqual({
      estado: "reversion_bloqueada",
      faltantes: [{ productoId: PRODUCTO_B, nombreProducto: "Producto B", disponible: 2, requerido: 5 }],
    })
    expect((await estadoDe(c.id)).estado).toBe("CONFIRMADA")
    expect((await estadoDe(c.id)).anuladoEn).toBeNull()
    expect(await arnes.saldoDe(PRODUCTO_A)).toBe(5)
    expect(await arnes.saldoDe(PRODUCTO_B)).toBe(2)
    expect((await movimientosDe(PRODUCTO_A)).filter((m) => m.tipo === "REVERSA")).toHaveLength(0)
  })

  it("informa todos los productos que no alcanzan", async () => {
    const c = await comprar([
      { productoId: PRODUCTO_A, cantidad: 5, costoUnitario: "10" },
      { productoId: PRODUCTO_B, cantidad: 5, costoUnitario: "10" },
    ])
    await decrementar(PRODUCTO_A, 1)
    await decrementar(PRODUCTO_B, 4)

    const r = await anular(c.id)

    expect(r.estado).toBe("reversion_bloqueada")
    if (r.estado !== "reversion_bloqueada") return
    expect(r.faltantes.map((f) => [f.productoId, f.disponible, f.requerido]).sort()).toEqual([
      [PRODUCTO_A, 4, 5],
      [PRODUCTO_B, 1, 5],
    ])
  })

  it("una vez liberado el stock, la compra bloqueada se puede anular", async () => {
    const c = await comprar([{ productoId: PRODUCTO_A, cantidad: 5, costoUnitario: "10" }])
    await decrementar(PRODUCTO_A, 2)
    expect((await anular(c.id)).estado).toBe("reversion_bloqueada")
    await registrarAjuste(arnes.db(), arnes.contrato(), {
      claveSolicitud: crypto.randomUUID(), productoId: PRODUCTO_A, tipo: "INCREMENTO", cantidad: 2, motivo: "Reposicion", actorId: ACTOR_COMPRAS,
    })

    expect((await anular(c.id)).estado).toBe("ok")
    expect(await arnes.saldoDe(PRODUCTO_A)).toBe(0)
  })

  it("compra inexistente: no_encontrada", async () => {
    expect(await anular(crypto.randomUUID())).toEqual({ estado: "no_encontrada" })
  })

  it("anulacion concurrente con un decremento: nunca hay saldo negativo y el resultado es coherente", async () => {
    // Saldo 5 por la compra. Anular resta 5; el decremento resta 3: no pueden confirmar los dos.
    for (let intento = 0; intento < 8; intento++) {
      await arnes.limpiar()
      await arnes.crearProducto(PRODUCTO_A, "Producto A")
      const c = await comprar([{ productoId: PRODUCTO_A, cantidad: 5, costoUnitario: "10" }])

      const [anulacion, decremento] = await Promise.all([anular(c.id), decrementar(PRODUCTO_A, 3)])

      const saldo = await arnes.saldoDe(PRODUCTO_A)
      expect(saldo).toBeGreaterThanOrEqual(0)
      if (anulacion.estado === "ok") {
        // Anulo primero: el decremento ya no encuentra stock.
        expect(decremento.estado).toBe("stock_insuficiente")
        expect(saldo).toBe(0)
        expect((await estadoDe(c.id)).estado).toBe("ANULADA")
      } else {
        // El decremento gano: la anulacion se bloqueo y la compra sigue vigente.
        expect(anulacion.estado).toBe("reversion_bloqueada")
        expect(decremento.estado).toBe("ok")
        expect(saldo).toBe(2)
        expect((await estadoDe(c.id)).estado).toBe("CONFIRMADA")
      }
      // El saldo siempre es la suma de sus movimientos.
      const suma = (await movimientosDe(PRODUCTO_A)).reduce((acumulado, m) => acumulado + m.delta, 0)
      expect(suma).toBe(saldo)
    }
  })

  it("anulaciones de dos compras que comparten productos, en sentidos opuestos, no se bloquean entre si", async () => {
    const c1 = await comprar([
      { productoId: PRODUCTO_A, cantidad: 2, costoUnitario: "1" },
      { productoId: PRODUCTO_B, cantidad: 2, costoUnitario: "1" },
    ])
    const c2 = await comprar([
      { productoId: PRODUCTO_B, cantidad: 3, costoUnitario: "1" },
      { productoId: PRODUCTO_A, cantidad: 3, costoUnitario: "1" },
    ])

    const resultados = await Promise.all([anular(c1.id), anular(c2.id), anular(c1.id), anular(c2.id)])

    expect(resultados.filter((r) => r.estado === "ok")).toHaveLength(2)
    expect(await arnes.saldoDe(PRODUCTO_A)).toBe(0)
    expect(await arnes.saldoDe(PRODUCTO_B)).toBe(0)
  })

  it("corregir un costo es anular y registrar otra compra: la historia anterior queda intacta", async () => {
    const c = await comprar([{ productoId: PRODUCTO_A, cantidad: 1, costoUnitario: "9.99" }])
    await anular(c.id)
    const nueva = await comprar([{ productoId: PRODUCTO_A, cantidad: 1, costoUnitario: "10.99" }])

    expect(nueva.id).not.toBe(c.id)
    expect(await arnes.saldoDe(PRODUCTO_A)).toBe(1)
    expect((await estadoDe(c.id)).total).toBe("9.99")
  })
})
