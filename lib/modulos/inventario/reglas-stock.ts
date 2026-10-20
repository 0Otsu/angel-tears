// Reglas puras de stock (B1..B5, ADR-003): sin base de datos, Next ni Zod, para probarlas sin
// infraestructura. Cantidades enteras; el saldo nunca queda negativo; el minimo null (sin
// minimo) es distinto de cero.

export type VariacionStock = {
  readonly productoId: string
  /** Entero distinto de cero: positivo incrementa, negativo decrementa. */
  readonly delta: number
}

export function esEnteroNoNegativo(valor: unknown): valor is number {
  return typeof valor === "number" && Number.isSafeInteger(valor) && valor >= 0
}

export function esCantidadPositiva(valor: unknown): valor is number {
  return esEnteroNoNegativo(valor) && valor > 0
}

/** El minimo es opcional: null/ausente (sin alerta) o un entero >= 0. Cero es un minimo real. */
export function esMinimoValido(valor: unknown): valor is number | null {
  return valor === null || esEnteroNoNegativo(valor)
}

/** Stock bajo significa saldo <= minimo (B1); sin minimo no participa (B2). */
export function esStockBajo(saldo: number, minimo: number | null): boolean {
  return minimo !== null && saldo <= minimo
}

/**
 * Suma las variaciones por producto antes de verificar saldo, de modo que dos lineas del mismo
 * producto se evaluen como una sola demanda. Devuelve los productos ordenados por ID, el orden
 * global de locks que evita deadlocks (blueprint, seccion 7). Los productos cuyo neto es cero
 * se conservan: igual deben existir y bloquearse.
 */
export function consolidarVariaciones(
  variaciones: readonly VariacionStock[],
): { productoId: string; delta: number }[] {
  const porProducto = new Map<string, number>()
  for (const { productoId, delta } of variaciones) {
    if (!Number.isSafeInteger(delta) || delta === 0) {
      throw new RangeError("Cada variacion de stock debe ser un entero distinto de cero.")
    }
    const acumulado = (porProducto.get(productoId) ?? 0) + delta
    if (!Number.isSafeInteger(acumulado)) {
      throw new RangeError("La variacion acumulada de stock excede el rango permitido.")
    }
    porProducto.set(productoId, acumulado)
  }
  return [...porProducto.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([productoId, delta]) => ({ productoId, delta }))
}

export type ResultadoSaldo =
  | { ok: true; saldoResultante: number }
  | { ok: false; disponible: number; requerido: number }

/** Aplica un delta a un saldo sin permitir que quede negativo. */
export function calcularSaldoResultante(saldo: number, delta: number): ResultadoSaldo {
  const saldoResultante = saldo + delta
  if (!Number.isSafeInteger(saldoResultante)) {
    throw new RangeError("El saldo resultante excede el rango permitido.")
  }
  if (saldoResultante < 0) {
    return { ok: false, disponible: saldo, requerido: -delta }
  }
  return { ok: true, saldoResultante }
}
