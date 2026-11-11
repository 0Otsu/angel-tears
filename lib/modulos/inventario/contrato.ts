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
 * Operacion que origina un movimiento: un ajuste o una linea de venta (change implement-sales).
 * La compra se agrega junto con CompraLinea (blueprint, seccion 12): no se adelantan tablas.
 */
export type OrigenMovimiento =
  | { readonly tipo: "AJUSTE"; readonly ajusteId: string }
  | { readonly tipo: "VENTA"; readonly ventaLineaId: string }
  | { readonly tipo: "COMPRA"; readonly compraLineaId: string }

/** Identificador estable y comparable de un origen, util para agrupar o comparar sin conocer su tabla. */
export function identificadorDeOrigen(origen: OrigenMovimiento): string {
  switch (origen.tipo) {
    case "AJUSTE": return `AJUSTE:${origen.ajusteId}`
    case "VENTA": return `VENTA:${origen.ventaLineaId}`
    case "COMPRA": return `COMPRA:${origen.compraLineaId}`
  }
}

export type VariacionConOrigen = VariacionStock & {
  readonly origen: OrigenMovimiento
  /**
   * ID del movimiento ORIGINAL que esta variacion revierte (anulaciones). La reversa conserva el
   * origen del original y su delta debe ser exactamente el opuesto; cada movimiento se revierte
   * una sola vez. Sin este campo, la variacion es un movimiento original.
   */
  readonly reversaDe?: string
}

export type ComandoAplicarMovimientos = {
  readonly variaciones: readonly VariacionConOrigen[]
  readonly actorId: string
}

export type SaldoAfectado = {
  readonly productoId: string
  readonly saldoAnterior: number
  readonly saldoResultante: number
}

/** Movimiento registrado; el resultado los entrega en el orden de las variaciones del comando. */
export type MovimientoRegistrado = {
  readonly id: string
  readonly productoId: string
  readonly delta: number
  readonly tipo: "ORIGINAL" | "REVERSA"
}

/** `productosAfectados` permite al limite Next refrescar Home/catalogo/PDP despues del commit. */
export type ResultadoAplicacion = {
  readonly saldos: readonly SaldoAfectado[]
  readonly movimientos: readonly MovimientoRegistrado[]
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

export const CODIGO_REVERSA_INVALIDA = "REVERSA_INVALIDA" as const

export type MotivoReversaInvalida =
  /** El movimiento a revertir no existe. */
  | "NO_ENCONTRADO"
  /** Solo se revierte un movimiento ORIGINAL, no otra reversa. */
  | "NO_ES_ORIGINAL"
  | "PRODUCTO_DISTINTO"
  | "ORIGEN_DISTINTO"
  /** El delta de la reversa no es exactamente el opuesto al del original. */
  | "DELTA_NO_OPUESTO"
  /** Ya existe una reversa de ese movimiento, o el comando la repite. */
  | "YA_REVERTIDO"

/**
 * La reversa pedida no cumple el contrato. Se rechaza toda la operacion sin efectos; el
 * llamador debe revertir su transaccion. `YA_REVERTIDO` garantiza el "exactamente una vez".
 */
export class ErrorReversaInvalida extends Error {
  readonly codigo = CODIGO_REVERSA_INVALIDA

  constructor(
    readonly movimientoId: string,
    readonly motivo: MotivoReversaInvalida,
  ) {
    super("La reversa de stock solicitada no es valida.")
    this.name = "ErrorReversaInvalida"
  }
}

export function esErrorReversaInvalida(error: unknown): error is ErrorReversaInvalida {
  return error instanceof ErrorReversaInvalida
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
 * `ErrorStockInsuficiente`, `ErrorProductoSinSaldo` o `ErrorReversaInvalida` sin efectos parciales.
 */
export type AplicarMovimientos = (
  tx: TransaccionLlamador,
  comando: ComandoAplicarMovimientos,
) => Promise<ResultadoAplicacion>

/** Lectura batched de disponibilidad; un ID inexistente no aparece en el resultado. */
export type ConsultarDisponibilidad = (
  productoIds: readonly string[],
) => Promise<readonly DisponibilidadProducto[]>

/** Movimiento ORIGINAL de un origen y si ya fue revertido; permite a una anulacion hallar su `reversaDe`. */
export type MovimientoDeOrigen = {
  readonly id: string
  readonly origen: OrigenMovimiento
  readonly productoId: string
  readonly delta: number
  readonly revertido: boolean
}

/** Lectura en la transaccion del llamador de los movimientos ORIGINAL de esos origenes. */
export type ConsultarMovimientosDeOrigen = (
  tx: TransaccionLlamador,
  origenes: readonly OrigenMovimiento[],
) => Promise<readonly MovimientoDeOrigen[]>

export type ContratoInventario = {
  readonly crearSaldoCero: CrearSaldoCero
  readonly aplicarMovimientos: AplicarMovimientos
  readonly consultarDisponibilidad: ConsultarDisponibilidad
  readonly consultarMovimientosDeOrigen: ConsultarMovimientosDeOrigen
}
