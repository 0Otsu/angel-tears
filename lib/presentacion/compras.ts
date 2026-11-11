import type { EstadoCompra } from "@/lib/modulos/compras/contrato"
import { centavosADecimal, decimalACentavos, multiplicarCentavos } from "@/lib/modulos/compras/dinero"

// Presentacion de Compras: puro, sin Next ni base de datos, para probarlo sin infraestructura.

/** `2026-11-05` -> `05/11/2026`, sin pasar por Date para no correr el dia por la zona horaria. */
export function formatearFechaCompra(iso: string): string {
  const [anio, mes, dia] = iso.split("-")
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : iso
}

/** Fecha local de hoy como `YYYY-MM-DD`: la que propone el formulario para la fecha de la compra. */
export function hoyEnFormatoIso(ahora: Date = new Date()): string {
  const dos = (n: number) => String(n).padStart(2, "0")
  return `${ahora.getFullYear()}-${dos(ahora.getMonth() + 1)}-${dos(ahora.getDate())}`
}

export function etiquetaEstadoCompra(estado: EstadoCompra): string {
  return estado === "CONFIRMADA" ? "Confirmada" : "Anulada"
}

/** Lo que se muestra cuando la compra no tiene proveedor; no se guarda como dato. */
export const SIN_PROVEEDOR = "Sin proveedor"

/** El costo se escribe con coma o punto; el servidor recibe siempre punto y valida el resto. */
export function normalizarCosto(texto: string): string {
  return texto.trim().replace(",", ".")
}

export type LineaFormularioCompra = { productoId: string; cantidad: string; costoUnitario: string }

export type EstimacionCompra = {
  /** Subtotal por linea (null si la linea todavia no esta completa o es invalida). */
  subtotales: (string | null)[]
  total: string
}

/**
 * Estimacion en pantalla con la misma aritmetica exacta del servidor. No reemplaza la
 * confirmacion: el servidor valida de nuevo y calcula el total que se guarda.
 */
export function estimarCompra(lineas: readonly LineaFormularioCompra[]): EstimacionCompra {
  let total = BigInt(0)
  const subtotales = lineas.map((linea) => {
    const cantidadTexto = linea.cantidad.trim()
    const costo = decimalACentavos(normalizarCosto(linea.costoUnitario))
    if (!linea.productoId || !/^\d{1,9}$/.test(cantidadTexto) || Number(cantidadTexto) < 1 || costo === null) return null
    const subtotal = multiplicarCentavos(costo, Number(cantidadTexto))
    total += subtotal
    return centavosADecimal(subtotal)
  })
  return { subtotales, total: centavosADecimal(total) }
}
