// Calculo de lineas y total de una compra (E1, E2, E4). Puro: los importes salen de las lineas,
// nunca del precio actual del producto, y las lineas con costos distintos no se fusionan.

import {
  centavosADecimal,
  decimalACentavos,
  multiplicarCentavos,
} from "@/lib/modulos/compras/dinero"
import { esCantidadPositiva } from "@/lib/modulos/inventario/reglas-stock"

export type LineaCompraEntrada = {
  readonly productoId: string
  readonly cantidad: number
  /** Texto decimal de hasta dos posiciones. */
  readonly costoUnitario: string
}

export type LineaCompraCalculada = LineaCompraEntrada & {
  readonly numeroLinea: number
  readonly subtotal: string
}

export type ErrorLineaCompra = {
  /** Indice (0-based) de la linea con el problema. */
  readonly linea: number
  readonly campo: "productoId" | "cantidad" | "costoUnitario"
  readonly codigo: "REQUERIDO" | "CANTIDAD_INVALIDA" | "IMPORTE_INVALIDO"
}

export type ResultadoCalculoCompra =
  | { ok: true; lineas: LineaCompraCalculada[]; total: string }
  | { ok: false; errores: ErrorLineaCompra[]; sinLineas: boolean }

export function calcularCompra(entrada: readonly LineaCompraEntrada[]): ResultadoCalculoCompra {
  if (entrada.length === 0) return { ok: false, errores: [], sinLineas: true }

  const errores: ErrorLineaCompra[] = []
  const lineas: LineaCompraCalculada[] = []
  let total = BigInt(0)

  entrada.forEach((linea, indice) => {
    if (!linea.productoId) {
      errores.push({ linea: indice, campo: "productoId", codigo: "REQUERIDO" })
    }
    if (!esCantidadPositiva(linea.cantidad)) {
      errores.push({ linea: indice, campo: "cantidad", codigo: "CANTIDAD_INVALIDA" })
    }
    const costo = decimalACentavos(linea.costoUnitario)
    if (costo === null) {
      errores.push({ linea: indice, campo: "costoUnitario", codigo: "IMPORTE_INVALIDO" })
    }
    if (errores.some((e) => e.linea === indice)) return

    const subtotal = multiplicarCentavos(costo!, linea.cantidad)
    total += subtotal
    lineas.push({ ...linea, numeroLinea: indice + 1, subtotal: centavosADecimal(subtotal) })
  })

  if (errores.length > 0) return { ok: false, errores, sinLineas: false }
  return { ok: true, lineas, total: centavosADecimal(total) }
}
