// Tipos de la administracion de Compras (tareas 4.1 a 4.5). Puros: los comparten el servidor y los
// componentes cliente sin arrastrar base de datos.

import type { CompraDetalle, FaltanteReversionCompra } from "@/lib/modulos/compras/contrato"

export type ProductoParaComprar = {
  productoId: string
  nombre: string
  categoriaNombre: string
  /** Stock actual, solo como contexto: el costo de la compra no sale del precio de venta. */
  saldo: number
}

export type ProveedorParaComprar = { id: string; nombre: string }

export type ErroresRegistroCompra = {
  fechaOperacion?: string
  proveedorId?: string
  nota?: string
  lineas?: string
  claveSolicitud?: string
  /** Errores de cada linea por indice (0-based), para marcarlos junto a su campo. */
  porLinea?: readonly { linea: number; productoId?: string; cantidad?: string; costoUnitario?: string }[]
}

export type ResultadoRegistroAdmin =
  | { estado: "ok"; compra: CompraDetalle; repetido: boolean }
  | { estado: "datos_invalidos"; errores: ErroresRegistroCompra }
  | { estado: "conflicto_solicitud" }
  | { estado: "producto_no_encontrado"; productoIds: readonly string[] }
  | { estado: "proveedor_no_encontrado" }
  | { estado: "proveedor_inactivo" }
  | { estado: "producto_sin_saldo"; productoId: string }
  | { estado: "sesion_requerida" }
  | { estado: "error_tecnico" }

export type ResultadoAnulacionAdmin =
  | { estado: "ok"; compra: CompraDetalle }
  | { estado: "ya_anulada"; compra: CompraDetalle }
  | { estado: "reversion_bloqueada"; faltantes: readonly FaltanteReversionCompra[] }
  | { estado: "no_encontrada" }
  | { estado: "sesion_requerida" }
  | { estado: "error_tecnico" }

export type ResultadoDetalleAdmin =
  | { estado: "ok"; compra: CompraDetalle }
  | { estado: "no_encontrada" }
  | { estado: "sesion_requerida" }
  | { estado: "error_tecnico" }
