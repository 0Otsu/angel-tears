// Contrato publico del modulo inventario (blueprint, seccion 6): crearSaldoCero,
// aplicarMovimientos y consultarDisponibilidad. Productos, Compras y las futuras Ventas
// dependen solo de este archivo; ninguno actualiza saldos directamente. Es puro: no importa
// Next, la base de datos ni el schema de Producto.

import type { VariacionStock } from "@/lib/modulos/inventario/reglas-stock"

/**
 * Transaccion del llamador. Inventario nunca abre ni confirma una transaccion propia dentro de
 * `crearSaldoCero` y `aplicarMovimientos`: el efecto de stock y la operacion de origen
 * (alta de Producto, compra, anulacion) se confirman o se revierten juntos. El tipo concreto
 * (transaccion de Drizzle) lo fija la implementacion con base de datos.
 */
export type TransaccionLlamador = object

/**
 * Operacion que origina un movimiento. Hoy solo existe el ajuste; la compra se agrega junto
 * con CompraLinea y la venta en la Ronda 2 (blueprint, seccion 12): no se adelantan tablas.
 */
export type OrigenMovimiento = { readonly tipo: "AJUSTE"; readonly ajusteId: string }

export type VariacionConOrigen = VariacionStock & { readonly origen: OrigenMovimiento }

export type ComandoAplicarMovimientos = {
  readonly variaciones: readonly VariacionConOrigen[]
  readonly actorId: string
}

export type SaldoAfectado = {
  readonly productoId: string
  readonly saldoAnterior: number
  readonly saldoResultante: number
}

/** `productosAfectados` permite al limite Next refrescar Home/catalogo/PDP despues del commit. */
export type ResultadoAplicacion = {
  readonly saldos: readonly SaldoAfectado[]
  readonly productosAfectados: readonly string[]
}

export type DisponibilidadProducto = {
  readonly productoId: string
  readonly hayStock: boolean
  /** Saldo y minimo exactos: solo para consumidores internos, nunca para el publico. */
  readonly saldo: number
  readonly minimo: number | null
}

export const CODIGO_STOCK_INSUFICIENTE = "STOCK_INSUFICIENTE" as const
export const CODIGO_PRODUCTO_SIN_SALDO = "PRODUCTO_SIN_SALDO" as const

/**
 * Alguna variacion dejaria un saldo negativo. Se rechaza toda la operacion; el llamador debe
 * revertir su transaccion. Informa el disponible para conservar el formulario (B6).
 */
export class ErrorStockInsuficiente extends Error {
  readonly codigo = CODIGO_STOCK_INSUFICIENTE

  constructor(
    readonly productoId: string,
    readonly disponible: number,
    readonly requerido: number,
  ) {
    super("El stock disponible no alcanza para la operacion.")
    this.name = "ErrorStockInsuficiente"
  }
}

/** El producto no tiene saldo: no existe o nunca se creo con `crearSaldoCero`. */
export class ErrorProductoSinSaldo extends Error {
  readonly codigo = CODIGO_PRODUCTO_SIN_SALDO

  constructor(readonly productoId: string) {
    super("El producto no tiene saldo de inventario.")
    this.name = "ErrorProductoSinSaldo"
  }
}

export function esErrorStockInsuficiente(error: unknown): error is ErrorStockInsuficiente {
  return error instanceof ErrorStockInsuficiente
}

export function esErrorProductoSinSaldo(error: unknown): error is ErrorProductoSinSaldo {
  return error instanceof ErrorProductoSinSaldo
}

/**
 * Crea el saldo en cero (minimo null) de un Producto, en la misma transaccion de su alta. La
 * clave primaria impide un saldo duplicado. No genera efecto economico ni compra.
 */
export type CrearSaldoCero = (tx: TransaccionLlamador, productoId: string) => Promise<void>

/**
 * Aplica variaciones firmadas bajo lock de filas ordenadas por producto, verifica no
 * negatividad de todas antes de modificar y registra movimientos. Lanza
 * `ErrorStockInsuficiente` o `ErrorProductoSinSaldo` sin efectos parciales.
 */
export type AplicarMovimientos = (
  tx: TransaccionLlamador,
  comando: ComandoAplicarMovimientos,
) => Promise<ResultadoAplicacion>

/** Lectura batched de disponibilidad; un ID inexistente no aparece en el resultado. */
export type ConsultarDisponibilidad = (
  productoIds: readonly string[],
) => Promise<readonly DisponibilidadProducto[]>

export type ContratoInventario = {
  readonly crearSaldoCero: CrearSaldoCero
  readonly aplicarMovimientos: AplicarMovimientos
  readonly consultarDisponibilidad: ConsultarDisponibilidad
}
