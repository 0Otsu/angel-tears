// Tipos de la administracion de Ventas (change implement-sales, 5.1 y 5.2). Puros: los comparten
// el servidor y los componentes cliente sin arrastrar base de datos.

import type { VentaDetalle } from "@/lib/modulos/ventas/contrato"

export type ProductoParaVender = {
  productoId: string
  nombre: string
  categoriaNombre: string
  /** Precio vigente: es el que se congela en la linea; la interfaz no lo edita. */
  precio: string
  saldo: number
}

export type ErroresRegistroVenta = {
  fechaOperacion?: string
  comprador?: string
  lineas?: string
  claveSolicitud?: string
  /** Errores de cada linea por indice (0-based), para marcarlos junto a su campo. */
  porLinea?: readonly { linea: number; productoId?: string; cantidad?: string }[]
}

export type ResultadoRegistroAdmin =
  | { estado: "ok"; venta: VentaDetalle; repetido: boolean }
  | { estado: "datos_invalidos"; errores: ErroresRegistroVenta }
  | { estado: "conflicto_solicitud" }
  | { estado: "producto_no_encontrado"; productoIds: readonly string[] }
  | { estado: "stock_insuficiente"; productoId: string; disponible: number; requerido: number }
  | { estado: "producto_sin_saldo"; productoId: string }
  | { estado: "sesion_requerida" }
  | { estado: "error_tecnico" }

export type ResultadoAnulacionAdmin =
  | { estado: "ok"; venta: VentaDetalle }
  | { estado: "ya_anulada"; venta: VentaDetalle }
  | { estado: "no_encontrada" }
  | { estado: "sesion_requerida" }
  | { estado: "error_tecnico" }

export type ResultadoDetalleAdmin =
  | { estado: "ok"; venta: VentaDetalle }
  | { estado: "no_encontrada" }
  | { estado: "sesion_requerida" }
  | { estado: "error_tecnico" }
