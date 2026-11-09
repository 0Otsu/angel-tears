// Reglas puras de Ventas (change implement-sales, 1.3; decisiones F1-F7 y B6): validacion de la
// entrada, calculo de lineas y total en centavos, y comprador opcional. Sin base de datos, Next ni
// Zod. El precio y el nombre de cada linea salen del Producto al momento de vender, nunca del
// cliente; el total sale de las lineas. Dinero con la aritmetica exacta de ADR-003.

import {
  centavosADecimal,
  decimalACentavos,
  multiplicarCentavos,
} from "@/lib/modulos/compras/dinero"
import { esCantidadPositiva } from "@/lib/modulos/inventario/reglas-stock"

/** Nombre que la presentacion muestra cuando la venta no tiene comprador; no se guarda como dato. */
export const CONSUMIDOR_FINAL = "Consumidor Final"

export function nombreDeComprador(comprador: string | null): string {
  return comprador ?? CONSUMIDOR_FINAL
}

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

export type LineaVentaEntrada = {
  readonly productoId: string
  readonly cantidad: number
}

export type EntradaVentaValida = {
  readonly fechaOperacion: string
  /** Texto sin espacios en los extremos, o null para Consumidor Final. */
  readonly comprador: string | null
  readonly lineas: readonly LineaVentaEntrada[]
}

export type ErrorEntradaVenta =
  | { readonly campo: "fechaOperacion"; readonly codigo: "FECHA_INVALIDA" }
  | { readonly campo: "comprador"; readonly codigo: "COMPRADOR_INVALIDO" }
  | { readonly campo: "lineas"; readonly codigo: "SIN_LINEAS" }
  | {
      readonly campo: "productoId" | "cantidad"
      /** Indice (0-based) de la linea con el problema. */
      readonly linea: number
      readonly codigo: "PRODUCTO_INVALIDO" | "CANTIDAD_INVALIDA"
    }

export type ResultadoEntradaVenta =
  | { ok: true; entrada: EntradaVentaValida }
  | { ok: false; errores: ErrorEntradaVenta[] }

/** La cantidad llega como texto de un formulario o como numero; cualquier otra cosa se rechaza. */
function aCantidad(valor: unknown): unknown {
  if (typeof valor === "string" && CANTIDAD_TEXTO.test(valor.trim())) return Number(valor.trim())
  return valor
}

/**
 * Valida y normaliza lo que envia el formulario. No decide limites que el negocio no definio
 * (cantidad maxima, cantidad de lineas, fechas futuras o antiguas): solo exige que existan y
 * que sean coherentes. Un comprador vacio o solo de espacios equivale a no informarlo.
 */
export function evaluarEntradaVenta(datos: {
  readonly fechaOperacion: unknown
  readonly comprador?: unknown
  readonly lineas: unknown
}): ResultadoEntradaVenta {
  const errores: ErrorEntradaVenta[] = []

  if (!esFechaOperacionValida(datos.fechaOperacion)) {
    errores.push({ campo: "fechaOperacion", codigo: "FECHA_INVALIDA" })
  }

  let comprador: string | null = null
  if (datos.comprador !== undefined && datos.comprador !== null) {
    if (typeof datos.comprador === "string") {
      comprador = datos.comprador.trim() === "" ? null : datos.comprador.trim()
    } else {
      errores.push({ campo: "comprador", codigo: "COMPRADOR_INVALIDO" })
    }
  }

  const lineas: LineaVentaEntrada[] = []
  if (!Array.isArray(datos.lineas) || datos.lineas.length === 0) {
    errores.push({ campo: "lineas", codigo: "SIN_LINEAS" })
  } else {
    datos.lineas.forEach((cruda: unknown, indice: number) => {
      const linea = (typeof cruda === "object" && cruda !== null ? cruda : {}) as Record<string, unknown>
      const productoId = linea.productoId
      const cantidad = aCantidad(linea.cantidad)
      const productoValido = typeof productoId === "string" && UUID.test(productoId)
      const cantidadValida = esCantidadPositiva(cantidad)
      if (!productoValido) errores.push({ campo: "productoId", linea: indice, codigo: "PRODUCTO_INVALIDO" })
      if (!cantidadValida) errores.push({ campo: "cantidad", linea: indice, codigo: "CANTIDAD_INVALIDA" })
      if (productoValido && cantidadValida) lineas.push({ productoId, cantidad })
    })
  }

  if (errores.length > 0) return { ok: false, errores }
  return { ok: true, entrada: { fechaOperacion: datos.fechaOperacion as string, comprador, lineas } }
}

/** Datos del Producto que se congelan en la linea; vienen del contrato de Producto, no del cliente. */
export type ProductoVendible = {
  readonly id: string
  readonly nombre: string
  /** Decimal exacto de dos posiciones. */
  readonly precio: string
}

export type LineaVentaCalculada = {
  readonly numeroLinea: number
  readonly productoId: string
  readonly nombreProductoHistorico: string
  readonly cantidad: number
  readonly precioUnitarioHistorico: string
  readonly subtotal: string
}

export type ResultadoCalculoVenta =
  | { ok: true; lineas: LineaVentaCalculada[]; total: string }
  /** Productos que el contrato de Producto no devolvio: se rechaza toda la venta. */
  | { ok: false; productosDesconocidos: string[] }

/**
 * Arma las lineas con el nombre y el precio vigentes y suma el total en centavos. Las lineas no
 * se fusionan aunque repitan producto: cada una conserva su numero y su propio movimiento de
 * stock; la demanda total por producto la consolida Inventario al verificar el saldo.
 */
export function calcularVenta(
  lineas: readonly LineaVentaEntrada[],
  productos: readonly ProductoVendible[],
): ResultadoCalculoVenta {
  const porId = new Map(productos.map((p) => [p.id, p]))
  const desconocidos = [...new Set(lineas.filter((l) => !porId.has(l.productoId)).map((l) => l.productoId))]
  if (desconocidos.length > 0) return { ok: false, productosDesconocidos: desconocidos }

  let total = BigInt(0)
  const calculadas = lineas.map((linea, indice): LineaVentaCalculada => {
    const producto = porId.get(linea.productoId)!
    const precio = decimalACentavos(producto.precio)
    // El precio de un Producto persistido ya es un decimal valido; si no lo es, es un dato corrupto.
    if (precio === null) throw new RangeError("El precio del producto no es un decimal valido.")
    const subtotal = multiplicarCentavos(precio, linea.cantidad)
    total += subtotal
    return {
      numeroLinea: indice + 1,
      productoId: linea.productoId,
      nombreProductoHistorico: producto.nombre,
      cantidad: linea.cantidad,
      precioUnitarioHistorico: centavosADecimal(precio),
      subtotal: centavosADecimal(subtotal),
    }
  })
  return { ok: true, lineas: calculadas, total: centavosADecimal(total) }
}

/** Contenido que identifica la solicitud: no incluye precios, para que reintentar no dependa de ellos. */
export function contenidoDeSolicitud(entrada: EntradaVentaValida) {
  return {
    fechaOperacion: entrada.fechaOperacion,
    comprador: entrada.comprador,
    lineas: entrada.lineas.map((l) => ({ productoId: l.productoId, cantidad: l.cantidad })),
  }
}
