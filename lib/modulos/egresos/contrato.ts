// Contrato privado de Egresos. Importes ARS exactos como texto; fechas comerciales ISO.
export type EstadoEgreso = "CONFIRMADO" | "ANULADO"
export type EgresoDetalle = {
  id: string; concepto: string; importe: string; moneda: "ARS"; fechaOperacion: string
  nota: string | null; estado: EstadoEgreso; creadoEn: string; anuladoEn: string | null
}
export type ErroresEgreso = Partial<Record<"concepto" | "importe" | "fechaOperacion" | "nota" | "claveSolicitud", string>>
export type FiltroEgresos = { desde?: unknown; hasta?: unknown; estado?: unknown; limite?: unknown }
export type ErroresFiltro = Partial<Record<keyof FiltroEgresos, string>>
export type ResultadoListado = { estado: "ok"; egresos: EgresoDetalle[]; hayMas: boolean } | { estado: "datos_invalidos"; errores: ErroresFiltro }
export type ResultadoDetalle = { estado: "ok"; egreso: EgresoDetalle } | { estado: "no_encontrado" } | { estado: "sesion_requerida" } | { estado: "error_tecnico" }
export type ResultadoRegistro =
  | { estado: "ok"; egreso: EgresoDetalle; repetido: boolean }
  | { estado: "datos_invalidos"; errores: ErroresEgreso }
  | { estado: "conflicto_solicitud" } | { estado: "sesion_requerida" } | { estado: "error_tecnico" }
export type ResultadoAnulacion =
  | { estado: "ok" | "ya_anulado"; egreso: EgresoDetalle }
  | { estado: "no_encontrado" } | { estado: "sesion_requerida" } | { estado: "error_tecnico" }
// Misma estructura conceptual que resumen de Compras/Ventas. Solo egresos MANUALES.
export type ResumenEgresosPeriodo = {
  desde: string | null; hasta: string | null
  vigentes: { cantidad: number; total: string }; anuladas: { cantidad: number }
}
export type ResultadoResumen = { estado: "ok"; resumen: ResumenEgresosPeriodo } | { estado: "datos_invalidos"; errores: ErroresFiltro }
