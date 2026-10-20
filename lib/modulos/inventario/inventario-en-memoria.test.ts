import { describe, expect, it } from "vitest"
import {
  esErrorProductoSinSaldo,
  esErrorStockInsuficiente,
  type VariacionConOrigen,
} from "@/lib/modulos/inventario/contrato"
import { crearInventarioEnMemoria } from "@/lib/modulos/inventario/inventario-en-memoria"

const tx = {}
const ajuste = { tipo: "AJUSTE", ajusteId: "ajuste-1" } as const

function variacion(productoId: string, delta: number): VariacionConOrigen {
  return { productoId, delta, origen: ajuste }
}

async function capturarError(promesa: Promise<unknown>): Promise<unknown> {
  try {
    await promesa
  } catch (error) {
    return error
  }
  throw new Error("Se esperaba que la promesa fuera rechazada")
}

describe("contrato de inventario (doble en memoria)", () => {
  it("crearSaldoCero deja saldo 0 y minimo null, y no admite duplicados", async () => {
    const inventario = crearInventarioEnMemoria()

    await inventario.crearSaldoCero(tx, "p1")

    await expect(inventario.consultarDisponibilidad(["p1"])).resolves.toEqual([
      { productoId: "p1", hayStock: false, saldo: 0, minimo: null },
    ])
    await expect(inventario.crearSaldoCero(tx, "p1")).rejects.toThrow()
  })

  it("aplica incrementos y registra el movimiento con el saldo resultante", async () => {
    const inventario = crearInventarioEnMemoria()
    await inventario.crearSaldoCero(tx, "p1")

    const resultado = await inventario.aplicarMovimientos(tx, {
      variaciones: [variacion("p1", 4)],
      actorId: "admin-1",
    })

    expect(resultado.saldos).toEqual([{ productoId: "p1", saldoAnterior: 0, saldoResultante: 4 }])
    expect(resultado.productosAfectados).toEqual(["p1"])
    expect(inventario.movimientos).toHaveLength(1)
    expect(inventario.movimientos[0]).toMatchObject({ delta: 4, saldoResultante: 4 })
  })

  it("rechaza todo si un solo producto quedaria negativo, sin efectos parciales", async () => {
    const inventario = crearInventarioEnMemoria()
    inventario.cargar("a", 10)
    inventario.cargar("b", 1)

    const error = await capturarError(
      inventario.aplicarMovimientos(tx, {
        variaciones: [variacion("a", -5), variacion("b", -2)],
        actorId: "admin-1",
      }),
    )

    expect(esErrorStockInsuficiente(error)).toBe(true)
    expect(error).toMatchObject({ productoId: "b", disponible: 1, requerido: 2 })
    const saldos = await inventario.consultarDisponibilidad(["a", "b"])
    expect(saldos.map((s) => s.saldo)).toEqual([10, 1])
    expect(inventario.movimientos).toHaveLength(0)
  })

  it("evalua juntas las lineas repetidas del mismo producto", async () => {
    const inventario = crearInventarioEnMemoria()
    inventario.cargar("a", 4)

    const error = await capturarError(
      inventario.aplicarMovimientos(tx, {
        variaciones: [variacion("a", -3), variacion("a", -3)],
        actorId: "admin-1",
      }),
    )

    expect(esErrorStockInsuficiente(error)).toBe(true)
    expect(error).toMatchObject({ disponible: 4, requerido: 6 })
  })

  it("informa un producto sin saldo con un error propio", async () => {
    const inventario = crearInventarioEnMemoria()

    const error = await capturarError(
      inventario.aplicarMovimientos(tx, {
        variaciones: [variacion("fantasma", 1)],
        actorId: "admin-1",
      }),
    )

    expect(esErrorProductoSinSaldo(error)).toBe(true)
  })

  it("consultarDisponibilidad omite IDs inexistentes y no repite IDs duplicados", async () => {
    const inventario = crearInventarioEnMemoria()
    inventario.cargar("a", 2, 2)

    const resultado = await inventario.consultarDisponibilidad(["a", "a", "zzz"])

    expect(resultado).toEqual([{ productoId: "a", hayStock: true, saldo: 2, minimo: 2 }])
  })
})
