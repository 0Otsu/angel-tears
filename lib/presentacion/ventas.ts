import { centavosADecimal, decimalACentavos, multiplicarCentavos } from "@/lib/modulos/compras/dinero"
import type { ProductoParaVender } from "@/lib/modulos/ventas/administracion-contrato"
import type { EstadoVenta } from "@/lib/modulos/ventas/contrato"

// Presentacion de Ventas: puro, sin Next ni base de datos, para probarlo sin infraestructura.

/** `2026-11-05` -> `05/11/2026`, sin pasar por Date para no correr el dia por la zona horaria. */
export function formatearFechaOperacion(iso: string): string {
  const [anio, mes, dia] = iso.split("-")
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : iso
}

/** Fecha local de hoy como `YYYY-MM-DD`: la que propone el formulario para la fecha de operacion. */
export function hoyEnFormatoIso(ahora: Date = new Date()): string {
  const dos = (n: number) => String(n).padStart(2, "0")
  return `${ahora.getFullYear()}-${dos(ahora.getMonth() + 1)}-${dos(ahora.getDate())}`
}

export function etiquetaEstadoVenta(estado: EstadoVenta): string {
  return estado === "CONFIRMADA" ? "Confirmada" : "Anulada"
}

export type LineaFormularioVenta = { productoId: string; cantidad: string }

export type EstimacionVenta = {
  /** Subtotal por linea (null si la linea todavia no esta completa o es invalida). */
  subtotales: (string | null)[]
  total: string
  /** Productos cuya demanda total supera el saldo conocido; solo orienta, el servidor decide. */
  faltantes: { productoId: string; disponible: number; requerido: number }[]
}

/**
 * Estimacion en pantalla con la misma aritmetica exacta del servidor. No reemplaza la
 * confirmacion: el stock se comprueba al guardar, bajo lock.
 */
export function estimarVenta(lineas: readonly LineaFormularioVenta[], productos: readonly ProductoParaVender[]): EstimacionVenta {
  const porId = new Map(productos.map((p) => [p.productoId, p]))
  const demanda = new Map<string, number>()
  let total = BigInt(0)
  const subtotales = lineas.map((linea) => {
    const producto = porId.get(linea.productoId)
    const texto = linea.cantidad.trim()
    if (!producto || !/^\d{1,9}$/.test(texto) || Number(texto) < 1) return null
    const cantidad = Number(texto)
    demanda.set(producto.productoId, (demanda.get(producto.productoId) ?? 0) + cantidad)
    const precio = decimalACentavos(producto.precio)
    if (precio === null) return null
    const subtotal = multiplicarCentavos(precio, cantidad)
    total += subtotal
    return centavosADecimal(subtotal)
  })
  const faltantes = [...demanda.entries()]
    .filter(([id, requerido]) => requerido > (porId.get(id)?.saldo ?? 0))
    .map(([productoId, requerido]) => ({ productoId, requerido, disponible: porId.get(productoId)?.saldo ?? 0 }))
  return { subtotales, total: centavosADecimal(total), faltantes }
}
