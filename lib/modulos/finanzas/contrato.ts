import type { ResumenEgresosPeriodo } from "@/lib/modulos/egresos/contrato"

// Forma compartida con los resúmenes administrativos de Ventas, Compras y Egresos.
export type ResumenFuente = ResumenEgresosPeriodo
export const FUENTES = ["ventas", "compras", "egresos"] as const
export type Fuente = typeof FUENTES[number]
export type FiltroFinanzas = {
  referencia?: unknown; modo?: unknown; anio?: unknown; mes?: unknown; desde?: unknown; hasta?: unknown; tipo?: unknown; estado?: unknown
}
export type PeriodoFinanzas = {
  modo: "mes" | "rango" | "anio" | "semana"; mes: string; desde: string; hasta: string; agrupacion: "dia" | "mes"
  tipo: "todos" | "compras" | "egresos"; estado: "todos" | "vigente" | "anulado"
}
export type ErroresPeriodo = Partial<Record<keyof FiltroFinanzas, string>>
export type OperacionSalida = {
  id: string; tipo: "compras" | "egresos"; concepto: string; fecha: string; importe: string; anulada: boolean
}
export type LecturaFuente =
  | { estado: "ok"; resumen: ResumenFuente; evolucion: { fecha: string; total: string }[]; operaciones: OperacionSalida[]; hayMas: boolean }
  | { estado: "error" }
export type FuentesFinanzas = Record<Fuente, LecturaFuente>
export type PuntoEvolucion = { fecha: string; ventas: string; compras: string; egresos: string }
export type ResumenFinanzas = {
  estado: "ok"; periodo: PeriodoFinanzas; fuentes: FuentesFinanzas; resultado: string | null
  evolucion: PuntoEvolucion[]; operaciones: OperacionSalida[]; hayMas: boolean
}
export type ResultadoFinanzas = ResumenFinanzas | { estado: "datos_invalidos"; errores: ErroresPeriodo }
export type LeerFinanzas = (periodo: PeriodoFinanzas, detalle: boolean) => Promise<FuentesFinanzas>
