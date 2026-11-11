import type { PeriodoFinanzas } from "@/lib/modulos/finanzas/contrato"

export const nombresFuentes = { ventas: "Ventas", compras: "Compras", egresos: "Gastos" } as const

export function importeFinanzas(importe: string): string {
  const negativo = importe.startsWith("-")
  const [entero, decimales = "00"] = (negativo ? importe.slice(1) : importe).split(".")
  const numero = new Intl.NumberFormat("es-AR").format(BigInt(entero))
  return `${negativo ? "−" : ""}ARS $ ${numero},${decimales.padEnd(2, "0")}`
}

export function fechaFinanzas(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-")
  return `${dia}/${mes}/${anio}`
}

export function etiquetaPeriodo(p: PeriodoFinanzas): string {
  return `${fechaFinanzas(p.desde)} al ${fechaFinanzas(p.hasta)}`
}
