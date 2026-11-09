// Tipos publicos de Ventas (change implement-sales, 1.2). Puros: los comparten el servidor y los
// componentes cliente sin arrastrar base de datos. Ventas depende de otros modulos solo por sus
// contratos: `ContratoInventario` (aplicarMovimientos, consultarMovimientosDeOrigen) y la lectura
// interna de Producto (`LeerProductosVendibles`, que el borde alimenta con
// `consultarProductosInternos`, ocultos incluidos).

import type { ErrorEntradaVenta, ProductoVendible } from "@/lib/modulos/ventas/reglas-venta"

/** Puerto de Producto: nombre y precio vigentes por ID; un ID inexistente se omite. */
export type LeerProductosVendibles = (
  productoIds: readonly string[],
) => Promise<readonly ProductoVendible[]>

export type EstadoVenta = "CONFIRMADA" | "ANULADA"

export type LineaVentaDetalle = {
  readonly numeroLinea: number
  readonly productoId: string
  readonly nombreProducto: string
  readonly cantidad: number
  /** Precio del momento de la venta; un cambio posterior del Producto no lo altera. */
  readonly precioUnitario: string
  readonly subtotal: string
}

export type VentaDetalle = {
  readonly id: string
  /** Fecha real de la venta, `YYYY-MM-DD`. */
  readonly fechaOperacion: string
  /** null significa Consumidor Final; la presentacion lo traduce, no se guarda como dato. */
  readonly comprador: string | null
  readonly total: string
  readonly estado: EstadoVenta
  /** Instante de carga en el sistema (ISO 8601 UTC), distinto de la fecha de operacion. */
  readonly creadoEn: string
  readonly anuladoEn: string | null
  readonly lineas: readonly LineaVentaDetalle[]
}

/** Fila del listado; el detalle con lineas se pide aparte. */
export type ResumenVenta = {
  readonly id: string
  readonly fechaOperacion: string
  readonly comprador: string | null
  readonly total: string
  readonly estado: EstadoVenta
  readonly cantidadLineas: number
  readonly creadoEn: string
}

/** Rango por fecha de operacion (inclusivo), nunca por fecha de carga. Todo es opcional. */
export type FiltroVentas = {
  readonly estado?: unknown
  readonly desde?: unknown
  readonly hasta?: unknown
  readonly limite?: unknown
}

export type ResultadoListadoVentas =
  | { estado: "ok"; ventas: readonly ResumenVenta[]; hayMas: boolean }
  | { estado: "datos_invalidos"; errores: Partial<Record<"estado" | "desde" | "hasta" | "limite", string>> }

export type ResultadoDetalleVenta =
  | { estado: "ok"; venta: VentaDetalle }
  | { estado: "no_encontrada" }

/**
 * Lectura para Dashboard y Finanzas: solo cuentan las ventas vigentes (CONFIRMADA); las anuladas
 * se conservan pero se excluyen del total. El total es un decimal exacto de dos posiciones.
 */
export type ResumenVentasPeriodo = {
  readonly desde: string | null
  readonly hasta: string | null
  readonly vigentes: { readonly cantidad: number; readonly total: string }
  readonly anuladas: { readonly cantidad: number }
}

export type ResultadoResumenVentas =
  | { estado: "ok"; resumen: ResumenVentasPeriodo }
  | { estado: "datos_invalidos"; errores: Partial<Record<"desde" | "hasta", string>> }

export type ResultadoAnulacionVenta =
  | { estado: "ok"; venta: VentaDetalle; productosAfectados: readonly string[] }
  /** Ya estaba anulada: se devuelve el registro actual sin repetir el reintegro. */
  | { estado: "ya_anulada"; venta: VentaDetalle }
  | { estado: "no_encontrada" }

export type ComandoRegistrarVenta = {
  /** UUID de la operacion logica; el cliente lo conserva para reintentar sin duplicar. */
  readonly claveSolicitud: string
  readonly fechaOperacion: unknown
  readonly comprador?: unknown
  readonly lineas: unknown
  readonly actorId: string
}

export type ResultadoRegistroVenta =
  /** `repetido` es true cuando la misma solicitud ya estaba confirmada: no hay un segundo efecto. */
  | {
      estado: "ok"
      venta: VentaDetalle
      repetido: boolean
      /** Para refrescar Home, catalogo y PDP desde el limite Next despues del commit. */
      productosAfectados: readonly string[]
    }
  | { estado: "datos_invalidos"; errores: ErrorEntradaVenta[] }
  /** La misma clave ya se uso con otro contenido. */
  | { estado: "conflicto_solicitud" }
  | { estado: "producto_no_encontrado"; productoIds: readonly string[] }
  /** Stock insuficiente (B6): no se descuenta nada y el formulario conserva lo ingresado. */
  | { estado: "stock_insuficiente"; productoId: string; disponible: number; requerido: number }
  | { estado: "producto_sin_saldo"; productoId: string }
