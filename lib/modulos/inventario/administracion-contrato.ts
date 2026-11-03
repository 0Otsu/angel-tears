// Tipos de la administracion de Inventario (tareas 2.1, 2.2 y 2.5). Puros: los comparten el
// servidor y los componentes cliente sin arrastrar base de datos.

import type { TipoAjuste } from "@/lib/modulos/inventario/reglas-ajuste"

export type FilaStock = {
  productoId: string
  nombre: string
  categoriaNombre: string
  publicado: boolean
  saldo: number
  /** null = sin minimo; cero es un minimo real. */
  minimo: number | null
  /** saldo <= minimo; nunca es true sin minimo. */
  stockBajo: boolean
  sinStock: boolean
}

export type MovimientoHistorial = {
  id: string
  delta: number
  saldoResultante: number
  tipo: "ORIGINAL" | "REVERSA"
  /** Tipo del ajuste que origino el movimiento. */
  tipoAjuste: TipoAjuste
  motivo: string
  actor: string
  creadoEn: string
}

export type ResultadoConsultaStock = { filas: FilaStock[] }

export type ResultadoAjusteAdmin =
  | { estado: "ok"; saldoResultante: number; repetido: boolean }
  | { estado: "datos_invalidos"; errores: Partial<Record<"productoId" | "tipo" | "cantidad" | "motivo" | "claveSolicitud", string>> }
  | { estado: "conflicto_solicitud" }
  | { estado: "stock_insuficiente"; disponible: number; requerido: number }
  | { estado: "producto_sin_saldo" }
  | { estado: "sesion_requerida" }
  | { estado: "error_tecnico" }

export type ResultadoMinimoAdmin =
  | { estado: "ok"; minimo: number | null }
  | { estado: "datos_invalidos"; errores: { minimo: string } }
  | { estado: "no_encontrado" }
  | { estado: "sesion_requerida" }
  | { estado: "error_tecnico" }

export type ResultadoHistorialAdmin =
  | { estado: "ok"; movimientos: MovimientoHistorial[] }
  | { estado: "no_encontrado" }
  | { estado: "sesion_requerida" }
  | { estado: "error_tecnico" }
