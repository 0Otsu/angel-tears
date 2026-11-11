import type { FilaStock } from "@/lib/modulos/inventario/administracion-contrato"
import { esCantidadPositiva, calcularSaldoResultante } from "@/lib/modulos/inventario/reglas-stock"

// Alias de compatibilidad de la UI; la politica vive exclusivamente en Inventario.
import { clasificarStock, type EstadoStock } from "@/lib/modulos/inventario/alertas-stock"
export { UMBRAL_GENERAL_STOCK as UMBRAL_VISUAL_POCAS_UNIDADES } from "@/lib/modulos/inventario/alertas-stock"
export type EstadoVisualStock = EstadoStock
export const estadoVisualStock = clasificarStock
export type FiltroStock = "" | EstadoVisualStock
export function filtroStock(valor: unknown): FiltroStock {
  return valor === "sin_stock" || valor === "pocas" || valor === "disponible" ? valor : ""
}
export function coincideFiltroStock(fila: FilaStock, filtro: FiltroStock) {
  return !filtro || estadoVisualStock(fila.saldo) === filtro
}
export function ordenarAtencionStock(filas: readonly FilaStock[]) {
  return [...filas].sort((a,b) => {
    const prioridad = (f: FilaStock) => estadoVisualStock(f.saldo) === "sin_stock" ? 0 : estadoVisualStock(f.saldo) === "pocas" ? 1 : 2
    return prioridad(a)-prioridad(b) || a.saldo-b.saldo || a.nombre.localeCompare(b.nombre,"es") || a.productoId.localeCompare(b.productoId)
  })
}
export function resumenStock(filas: readonly FilaStock[]) {
  return { total: filas.length, sinStock: filas.filter(f=>estadoVisualStock(f.saldo)==="sin_stock").length, pocas: filas.filter(f=>estadoVisualStock(f.saldo)==="pocas").length }
}
export const enlaceFiltroStock = (filtro: FiltroStock) => filtro ? `/admin/productos?stock=${filtro}` : "/admin/productos"

export function estimarAjusteStock(saldo: number, tipo: string, texto: string) {
  if (!/^\d{1,9}$/.test(texto.trim())) return null
  const cantidad = Number(texto)
  if (!esCantidadPositiva(cantidad) || (tipo !== "INCREMENTO" && tipo !== "DECREMENTO")) return null
  return calcularSaldoResultante(saldo,tipo === "DECREMENTO" ? -cantidad : cantidad)
}
