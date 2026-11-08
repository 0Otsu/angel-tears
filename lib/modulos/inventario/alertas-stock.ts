// Criterio comercial aprobado por Sofi. Fuente unica para servicio y presentacion.
export const UMBRAL_GENERAL_STOCK = 3
export type EstadoStock = "sin_stock" | "pocas" | "disponible"
export function clasificarStock(saldo: number): EstadoStock {
  return saldo === 0 ? "sin_stock" : saldo <= UMBRAL_GENERAL_STOCK ? "pocas" : "disponible"
}
