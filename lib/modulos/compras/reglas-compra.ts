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

// --- Validacion de la entrada de una compra (E1, E2, E3) -------------------------------------

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const FECHA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/
const CANTIDAD_TEXTO = /^\d{1,9}$/

/** Fecha comercial `YYYY-MM-DD` que existe en el calendario (ADR-003); sin hora ni zona. */
export function esFechaOperacionValida(valor: unknown): valor is string {
  if (typeof valor !== "string") return false
  const partes = FECHA_ISO.exec(valor)
  if (!partes) return false
  const [anio, mes, dia] = [Number(partes[1]), Number(partes[2]), Number(partes[3])]
  const fecha = new Date(Date.UTC(anio, mes - 1, dia))
  return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia
}

export type EntradaCompraValida = {
  readonly fechaOperacion: string
  /** null cuando la compra no tiene proveedor: no se exige uno ficticio. */
  readonly proveedorId: string | null
  /** Texto sin espacios en los extremos, o null. */
  readonly nota: string | null
  readonly lineas: readonly LineaCompraEntrada[]
}

export type ErrorEntradaCompra =
  | { readonly campo: "fechaOperacion"; readonly codigo: "FECHA_INVALIDA" }
  | { readonly campo: "proveedorId"; readonly codigo: "PROVEEDOR_INVALIDO" }
  | { readonly campo: "nota"; readonly codigo: "NOTA_INVALIDA" }
  | { readonly campo: "lineas"; readonly codigo: "SIN_LINEAS" }
  | {
      readonly campo: "productoId" | "cantidad" | "costoUnitario"
      /** Indice (0-based) de la linea con el problema. */
      readonly linea: number
      readonly codigo: "PRODUCTO_INVALIDO" | "CANTIDAD_INVALIDA" | "IMPORTE_INVALIDO"
    }

export type ResultadoEntradaCompra =
  | { ok: true; entrada: EntradaCompraValida }
  | { ok: false; errores: ErrorEntradaCompra[] }

function aCantidad(valor: unknown): unknown {
  if (typeof valor === "string" && CANTIDAD_TEXTO.test(valor.trim())) return Number(valor.trim())
  return valor
}

/**
 * Valida y normaliza lo que envia el formulario. No decide limites que el negocio no definio
 * (cantidad o importe maximo, cantidad de lineas, fechas futuras o antiguas, costo cero): solo
 * exige que existan y sean coherentes. Un costo con mas de dos decimales se rechaza sin
 * redondear. Proveedor y nota vacios equivalen a no informarlos.
 */
export function evaluarEntradaCompra(datos: {
  readonly fechaOperacion: unknown
  readonly proveedorId?: unknown
  readonly nota?: unknown
  readonly lineas: unknown
}): ResultadoEntradaCompra {
  const errores: ErrorEntradaCompra[] = []

  if (!esFechaOperacionValida(datos.fechaOperacion)) {
    errores.push({ campo: "fechaOperacion", codigo: "FECHA_INVALIDA" })
  }

  let proveedorId: string | null = null
  if (datos.proveedorId !== undefined && datos.proveedorId !== null && datos.proveedorId !== "") {
    if (typeof datos.proveedorId === "string" && UUID.test(datos.proveedorId)) proveedorId = datos.proveedorId
    else errores.push({ campo: "proveedorId", codigo: "PROVEEDOR_INVALIDO" })
  }

  let nota: string | null = null
  if (datos.nota !== undefined && datos.nota !== null) {
    if (typeof datos.nota === "string") nota = datos.nota.trim() === "" ? null : datos.nota.trim()
    else errores.push({ campo: "nota", codigo: "NOTA_INVALIDA" })
  }

  const lineas: LineaCompraEntrada[] = []
  if (!Array.isArray(datos.lineas) || datos.lineas.length === 0) {
    errores.push({ campo: "lineas", codigo: "SIN_LINEAS" })
  } else {
    datos.lineas.forEach((cruda: unknown, indice: number) => {
      const linea = (typeof cruda === "object" && cruda !== null ? cruda : {}) as Record<string, unknown>
      const cantidad = aCantidad(linea.cantidad)
      const costo = typeof linea.costoUnitario === "string" ? linea.costoUnitario.trim() : linea.costoUnitario
      const productoValido = typeof linea.productoId === "string" && UUID.test(linea.productoId)
      const cantidadValida = esCantidadPositiva(cantidad)
      const costoValido = typeof costo === "string" && decimalACentavos(costo) !== null
      if (!productoValido) errores.push({ campo: "productoId", linea: indice, codigo: "PRODUCTO_INVALIDO" })
      if (!cantidadValida) errores.push({ campo: "cantidad", linea: indice, codigo: "CANTIDAD_INVALIDA" })
      if (!costoValido) errores.push({ campo: "costoUnitario", linea: indice, codigo: "IMPORTE_INVALIDO" })
      if (productoValido && cantidadValida && costoValido) {
        lineas.push({
          productoId: linea.productoId as string,
          cantidad: cantidad as number,
          // Forma canonica: "10" y "10.00" son el mismo costo.
          costoUnitario: centavosADecimal(decimalACentavos(costo as string)!),
        })
      }
    })
  }

  if (errores.length > 0) return { ok: false, errores }
  return { ok: true, entrada: { fechaOperacion: datos.fechaOperacion as string, proveedorId, nota, lineas } }
}

/** Contenido que identifica la solicitud; el orden de las lineas importa y se conserva. */
export function contenidoDeSolicitud(entrada: EntradaCompraValida) {
  return {
    fechaOperacion: entrada.fechaOperacion,
    proveedorId: entrada.proveedorId,
    nota: entrada.nota,
    lineas: entrada.lineas.map((l) => ({ productoId: l.productoId, cantidad: l.cantidad, costoUnitario: l.costoUnitario })),
  }
}
