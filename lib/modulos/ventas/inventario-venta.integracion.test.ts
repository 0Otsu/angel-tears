import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { eq, inArray, sql } from "drizzle-orm"
import type { ConexionBd } from "@/lib/infraestructura/conexion-bd"
import { ajusteStock, inventario, movimientoStock } from "@/lib/infraestructura/esquemas/inventario"
import { producto } from "@/lib/infraestructura/esquemas/producto"
import { venta, ventaLinea } from "@/lib/infraestructura/esquemas/venta"
import {
  esErrorReversaInvalida,
  esErrorStockInsuficiente,
  type OrigenMovimiento,
  type VariacionConOrigen,
} from "@/lib/modulos/inventario/contrato"
import { crearContratoInventario } from "@/lib/modulos/inventario/persistencia"
import { insertarProductoOcultoConSaldo, sembrarCategorias } from "@/lib/modulos/productos/persistencia"
import { crearConexionPruebas } from "@/pruebas/arnes-bd"

// Origen VENTA del contrato de Inventario contra PostgreSQL real (change implement-sales, 2.2):
// descuento con la linea de venta como origen y reversa unica con la API de reversas de Inventario
// (`reversaDe` + `consultarMovimientosDeOrigen`).

const ACTOR = "usuario-prueba-venta-inventario"
const PRODUCTO_A = "a8888888-8888-4888-8888-888888888888"
const PRODUCTO_B = "b9999999-9999-4999-8999-999999999999"

describe("origen VENTA del contrato de inventario sobre PostgreSQL", () => {
  let conexion: ConexionBd | undefined

  function db() {
    if (!conexion) throw new Error("La conexion de pruebas no esta disponible.")
    return conexion.db
  }
  const contrato = () => crearContratoInventario(db())

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

  // Una venta con una linea por producto indicado; devuelve el origen de cada linea.
  async function crearVentaConLineas(productoIds: string[]) {
    const [cabecera] = await db()
      .insert(venta)
      .values({ fechaOperacion: "2026-11-09", total: "0.00", actorId: ACTOR, claveSolicitud: crypto.randomUUID(), huella: "h" })
      .returning({ id: venta.id })
    const filas = await db()
      .insert(ventaLinea)
      .values(
        productoIds.map((productoId, i) => ({
          ventaId: cabecera.id, numeroLinea: i + 1, productoId, nombreProductoHistorico: "Producto",
          cantidad: 1, precioUnitarioHistorico: "0.00", subtotal: "0.00",
        })),
      )
      .returning({ id: ventaLinea.id, productoId: ventaLinea.productoId })
    return filas.map((f) => ({ productoId: f.productoId, origen: { tipo: "VENTA", ventaLineaId: f.id } as const }))
  }

  const descontar = (lineas: { productoId: string; origen: OrigenMovimiento }[], cantidad: number) =>
    db().transaction((tx) =>
      contrato().aplicarMovimientos(tx, {
        actorId: ACTOR,
        variaciones: lineas.map((l) => ({ productoId: l.productoId, delta: -cantidad, origen: l.origen })),
      }),
    )

  // Pide a Inventario los originales de las lineas y arma sus reversas, como hara la anulacion.
  const anular = (lineas: { origen: OrigenMovimiento }[]) =>
    db().transaction(async (tx) => {
      const originales = await contrato().consultarMovimientosDeOrigen(tx, lineas.map((l) => l.origen))
      const variaciones: VariacionConOrigen[] = originales.map((o) => ({
        productoId: o.productoId, delta: -o.delta, origen: o.origen, reversaDe: o.id,
      }))
      return contrato().aplicarMovimientos(tx, { actorId: ACTOR, variaciones })
    })

  async function motivoDe(promesa: Promise<unknown>) {
    try { await promesa } catch (error) {
      if (esErrorReversaInvalida(error)) return error.motivo
      throw error
    }
    return "sin error"
  }

  const codigo = (codigoSql: string) => ({ cause: { code: codigoSql } })

  beforeAll(async () => {
    conexion = crearConexionPruebas()
    await db().transaction(sembrarCategorias)
    await db().execute(sql`
      INSERT INTO "user" (id, name, email) VALUES (${ACTOR}, 'Prueba', 'prueba-venta-inventario@ejemplo.com')
      ON CONFLICT (id) DO NOTHING`)
  })

  beforeEach(async () => {
    await limpiar()
    for (const [id, nombre] of [[PRODUCTO_A, "Producto A"], [PRODUCTO_B, "Producto B"]]) {
      await db().transaction(async (tx) => {
        await insertarProductoOcultoConSaldo(
          tx, id, { nombre, precio: "10.00", categoriaCodigo: "collares" }, contrato().crearSaldoCero,
        )
      })
    }
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

  it("descuenta con la linea de venta como origen y no con un ajuste", async () => {
    await fijarSaldo(PRODUCTO_A, 5)
    const [linea] = await crearVentaConLineas([PRODUCTO_A])

    const resultado = await descontar([linea], 2)

    expect(resultado.saldos).toEqual([{ productoId: PRODUCTO_A, saldoAnterior: 5, saldoResultante: 3 }])
    const [mov] = await db().select().from(movimientoStock)
    expect(mov).toMatchObject({ tipo: "ORIGINAL", delta: -2, ajusteId: null, ventaLineaId: linea.origen.ventaLineaId })
  })

  it("la base exige exactamente un origen y un solo original por linea", async () => {
    await fijarSaldo(PRODUCTO_A, 5)
    const [linea] = await crearVentaConLineas([PRODUCTO_A])
    const base = { productoId: PRODUCTO_A, delta: -1, saldoResultante: 4, actorId: ACTOR }

    await expect(db().insert(movimientoStock).values(base)).rejects.toMatchObject(codigo("23514"))
    await descontar([linea], 1)
    await expect(
      db().insert(movimientoStock).values({ ...base, ventaLineaId: linea.origen.ventaLineaId }),
    ).rejects.toMatchObject(codigo("23505"))
  })

  it("encuentra los originales de varias lineas y marca los ya revertidos", async () => {
    await fijarSaldo(PRODUCTO_A, 5)
    await fijarSaldo(PRODUCTO_B, 5)
    const lineas = await crearVentaConLineas([PRODUCTO_A, PRODUCTO_B])
    await descontar(lineas, 1)

    const antes = await db().transaction((tx) => contrato().consultarMovimientosDeOrigen(tx, lineas.map((l) => l.origen)))
    await anular(lineas)
    const despues = await db().transaction((tx) => contrato().consultarMovimientosDeOrigen(tx, lineas.map((l) => l.origen)))

    expect(antes).toHaveLength(2)
    expect(antes.every((m) => !m.revertido && m.origen.tipo === "VENTA")).toBe(true)
    expect(despues).toHaveLength(2)
    expect(despues.every((m) => m.revertido)).toBe(true)
  })

  it("anular reintegra todas las lineas, conserva el origen y deja reversas ligadas", async () => {
    await fijarSaldo(PRODUCTO_A, 5)
    await fijarSaldo(PRODUCTO_B, 3)
    const lineas = await crearVentaConLineas([PRODUCTO_A, PRODUCTO_B])
    await descontar(lineas, 2)

    const resultado = await anular(lineas)

    expect(resultado.movimientos.every((m) => m.tipo === "REVERSA")).toBe(true)
    expect(await saldoDe(PRODUCTO_A)).toBe(5)
    expect(await saldoDe(PRODUCTO_B)).toBe(3)
    const reversas = await db().select().from(movimientoStock).where(eq(movimientoStock.tipo, "REVERSA"))
    expect(reversas).toHaveLength(2)
    expect(reversas.map((r) => r.ventaLineaId).sort()).toEqual(lineas.map((l) => l.origen.ventaLineaId).sort())
    expect(reversas.every((r) => r.reversaDe !== null && r.ajusteId === null)).toBe(true)
  })

  it("una segunda anulacion se rechaza como YA_REVERTIDO sin cambiar el saldo", async () => {
    await fijarSaldo(PRODUCTO_A, 5)
    const lineas = await crearVentaConLineas([PRODUCTO_A])
    await descontar(lineas, 2)
    await anular(lineas)

    const motivo = await motivoDe(anular(lineas))

    expect(motivo).toBe("YA_REVERTIDO")
    expect(await saldoDe(PRODUCTO_A)).toBe(5)
    expect(await db().select().from(movimientoStock).where(eq(movimientoStock.tipo, "REVERSA"))).toHaveLength(1)
  })

  it("dos anulaciones simultaneas de la misma venta reintegran una sola vez", async () => {
    await fijarSaldo(PRODUCTO_A, 5)
    const lineas = await crearVentaConLineas([PRODUCTO_A])
    await descontar(lineas, 3)

    const resultados = await Promise.allSettled([anular(lineas), anular(lineas), anular(lineas)])

    expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(1)
    for (const r of resultados) {
      if (r.status === "rejected") expect(esErrorReversaInvalida(r.reason) && r.reason.motivo).toBe("YA_REVERTIDO")
    }
    expect(await saldoDe(PRODUCTO_A)).toBe(5)
  })

  it("rechaza una reversa que declara un origen distinto del original", async () => {
    await fijarSaldo(PRODUCTO_A, 5)
    const [original, otra] = await crearVentaConLineas([PRODUCTO_A, PRODUCTO_A])
    const { movimientos } = await descontar([original], 1)

    const motivo = await motivoDe(
      db().transaction((tx) =>
        contrato().aplicarMovimientos(tx, {
          actorId: ACTOR,
          variaciones: [{ productoId: PRODUCTO_A, delta: 1, origen: otra.origen, reversaDe: movimientos[0].id }],
        }),
      ),
    )

    expect(motivo).toBe("ORIGEN_DISTINTO")
    expect(await saldoDe(PRODUCTO_A)).toBe(4)
  })

  it("si una linea no alcanza, no descuenta ninguna y no deja movimientos", async () => {
    await fijarSaldo(PRODUCTO_A, 5)
    await fijarSaldo(PRODUCTO_B, 1)
    const lineas = await crearVentaConLineas([PRODUCTO_A, PRODUCTO_B])

    const error = await descontar(lineas, 2).catch((e: unknown) => e)

    expect(esErrorStockInsuficiente(error)).toBe(true)
    expect(error).toMatchObject({ productoId: PRODUCTO_B, disponible: 1, requerido: 2 })
    expect(await saldoDe(PRODUCTO_A)).toBe(5)
    expect(await saldoDe(PRODUCTO_B)).toBe(1)
    expect(await db().select().from(movimientoStock)).toHaveLength(0)
  })

  it("el rollback de la transaccion del llamador descarta descuento y movimientos", async () => {
    await fijarSaldo(PRODUCTO_A, 5)
    const lineas = await crearVentaConLineas([PRODUCTO_A])

    await expect(
      db().transaction(async (tx) => {
        await contrato().aplicarMovimientos(tx, {
          actorId: ACTOR,
          variaciones: [{ productoId: PRODUCTO_A, delta: -2, origen: lineas[0].origen }],
        })
        throw new Error("falla posterior")
      }),
    ).rejects.toThrow("falla posterior")

    expect(await saldoDe(PRODUCTO_A)).toBe(5)
    expect(await db().select().from(movimientoStock)).toHaveLength(0)
  })
})
