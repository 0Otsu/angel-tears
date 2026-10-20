// Aritmetica monetaria exacta (ADR-003): el texto decimal se convierte a centavos bigint, se
// opera en enteros y se vuelve a texto. Nunca Number/parseFloat. Una entrada con mas de dos
// decimales se rechaza; no se redondea. Cero y signos comerciales siguen pendientes de
// decision: este modulo solo acepta texto decimal no negativo y no decide limites de negocio.

// El target de tsconfig es anterior a ES2020: no se pueden usar literales bigint (100n).
const CIEN = BigInt(100)
const CERO = BigInt(0)

const FORMATO_DECIMAL = /^(\d+)(?:\.(\d{1,2}))?$/

/** Convierte "1234.5" en 123450n, o devuelve null si el formato no es valido. */
export function decimalACentavos(texto: string): bigint | null {
  const coincidencia = FORMATO_DECIMAL.exec(texto)
  if (!coincidencia) return null
  const [, enteros, decimales = ""] = coincidencia
  return BigInt(enteros) * CIEN + BigInt(decimales.padEnd(2, "0"))
}

/** Convierte 123450n en "1234.50". */
export function centavosADecimal(centavos: bigint): string {
  if (centavos < CERO) throw new RangeError("Los centavos no pueden ser negativos.")
  const enteros = centavos / CIEN
  const decimales = (centavos % CIEN).toString().padStart(2, "0")
  return `${enteros}.${decimales}`
}

export function multiplicarCentavos(centavos: bigint, cantidad: number): bigint {
  if (!Number.isSafeInteger(cantidad) || cantidad < 0) {
    throw new RangeError("La cantidad debe ser un entero no negativo.")
  }
  return centavos * BigInt(cantidad)
}
