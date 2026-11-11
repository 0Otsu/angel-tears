import type { Paginacion } from "@/lib/paginacion"
// Tipos publicos de Compras (change implement-inventory-suppliers-purchases, 4.x). Puros: los
// comparten el servidor y los componentes cliente sin arrastrar base de datos. Compras depende de
// otros modulos solo por sus contratos: `ContratoInventario` (aplicarMovimientos,
// consultarMovimientosDeOrigen) y la lectura interna de Producto (`LeerProductosParaCompra`).

import type { ErrorEntradaCompra } from "@/lib/modulos/compras/reglas-compra"

/** Puerto de Producto: nombre vigente por ID; un ID inexistente se omite. Ocultos incluidos. */
export type LeerProductosParaCompra = (
  productoIds: readonly string[],
) => Promise<readonly { readonly id: string; readonly nombre: string }[]>

export type EstadoCompra = "CONFIRMADA" | "ANULADA"

export type LineaCompraDetalle = {
  readonly numeroLinea: number
  readonly productoId: string
  /** Nombre del momento de la compra; un cambio posterior del Producto no lo altera. */
  readonly nombreProducto: string
  readonly cantidad: number
  /** Costo del momento de la compra (historico). */
  readonly costoUnitario: string
  readonly subtotal: string
}

export type CompraDetalle = {
  readonly id: string
  /** Fecha real de la compra, `YYYY-MM-DD`. */
  readonly fechaOperacion: string
  readonly proveedorId: string | null
  /** Nombre del proveedor al registrar la compra, o null si no tiene proveedor. */
  readonly nombreProveedor: string | null
  readonly nota: string | null
  readonly total: string
  readonly estado: EstadoCompra
  /** Instante de carga en el sistema (ISO 8601 UTC), distinto de la fecha de operacion. */
  readonly creadoEn: string
  readonly anuladoEn: string | null
  readonly lineas: readonly LineaCompraDetalle[]
}

/** Fila del listado; el detalle con lineas se pide aparte. */
export type ResumenCompra = {
  readonly id: string
  readonly fechaOperacion: string
  readonly nombreProveedor: string | null
  readonly total: string
  readonly estado: EstadoCompra
  readonly cantidadLineas: number
  readonly creadoEn: string
}

/** Rango por fecha de operacion (inclusivo), nunca por fecha de carga. Todo es opcional. */
export type FiltroCompras = {
  readonly estado?: unknown
  readonly desde?: unknown
  readonly hasta?: unknown
  readonly limite?: unknown
  readonly pagina?: unknown
}

export type ResultadoListadoCompras =
  | { estado: "ok"; compras: readonly ResumenCompra[]; hayMas: boolean; paginacion?: Paginacion }
  | { estado: "datos_invalidos"; errores: Partial<Record<"estado" | "desde" | "hasta" | "limite" | "pagina", string>> }

export type ResultadoDetalleCompra =
  | { estado: "ok"; compra: CompraDetalle }
  | { estado: "no_encontrada" }

/**
 * Lectura para Dashboard y Finanzas: solo cuentan las compras vigentes (CONFIRMADA); las anuladas
 * se conservan pero se excluyen del total. La compra cuenta una sola vez como egreso, y no se
 * vuelve a registrar como egreso manual. El total es un decimal exacto de dos posiciones.
 */
export type ResumenComprasPeriodo = {
  readonly desde: string | null
  readonly hasta: string | null
  readonly vigentes: { readonly cantidad: number; readonly total: string }
  readonly anuladas: { readonly cantidad: number }
}

export type ResultadoResumenCompras =
  | { estado: "ok"; resumen: ResumenComprasPeriodo }
  | { estado: "datos_invalidos"; errores: Partial<Record<"desde" | "hasta", string>> }

export type FaltanteReversionCompra = {
  readonly productoId: string
  readonly nombreProducto: string
  readonly disponible: number
  readonly requerido: number
}

export type ResultadoAnulacionCompra =
  | { estado: "ok"; compra: CompraDetalle; productosAfectados: readonly string[] }
  /** Ya estaba anulada: se devuelve el registro actual sin repetir la reversion. */
  | { estado: "ya_anulada"; compra: CompraDetalle }
  /** Alguna reversion dejaria saldo negativo: no se aplica nada de la anulacion. */
  | { estado: "reversion_bloqueada"; faltantes: readonly FaltanteReversionCompra[] }
  | { estado: "no_encontrada" }

export type ComandoRegistrarCompra = {
  /** UUID de la operacion logica; el cliente lo conserva para reintentar sin duplicar. */
  readonly claveSolicitud: string
  readonly fechaOperacion: unknown
  readonly proveedorId?: unknown
  readonly nota?: unknown
  readonly lineas: unknown
  readonly actorId: string
}

export type ResultadoRegistroCompra =
  /** `repetido` es true cuando la misma solicitud ya estaba confirmada: no hay un segundo efecto. */
  | {
      estado: "ok"
      compra: CompraDetalle
      repetido: boolean
      /** Para refrescar Home, catalogo y PDP desde el limite Next despues del commit. */
      productosAfectados: readonly string[]
    }
  | { estado: "datos_invalidos"; errores: ErrorEntradaCompra[] }
  /** La misma clave ya se uso con otro contenido. */
  | { estado: "conflicto_solicitud" }
  | { estado: "producto_no_encontrado"; productoIds: readonly string[] }
  | { estado: "proveedor_no_encontrado" }
  /** Un proveedor inactivo no se ofrece en compras nuevas. */
  | { estado: "proveedor_inactivo" }
  | { estado: "producto_sin_saldo"; productoId: string }
