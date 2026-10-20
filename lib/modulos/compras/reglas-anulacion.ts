// Planificacion de la anulacion de una compra (E5): se revierte una sola vez y todo o nada. Puro:
// recibe la compra y los saldos ya bloqueados y decide; el efecto y el cambio de estado los
// aplica el servicio en una unica transaccion.

import {
  calcularSaldoResultante,
  consolidarVariaciones,
  type VariacionStock,
} from "@/lib/modulos/inventario/reglas-stock"

export type CompraParaAnular = {
  readonly estado: "CONFIRMADA" | "ANULADA"
  readonly lineas: readonly { readonly productoId: string; readonly cantidad: number }[]
}

export type FaltanteReversion = {
  readonly productoId: string
  readonly disponible: number
  readonly requerido: number
}

export type PlanAnulacion =
  /** Ya estaba anulada: se devuelve el registro actual sin repetir ningun efecto. */
  | { tipo: "YA_ANULADA" }
  /** Alguna reversion dejaria saldo negativo: se rechaza toda la anulacion. */
  | { tipo: "BLOQUEADA"; faltantes: FaltanteReversion[] }
  /** Una reversa por linea original, con el signo opuesto a su efecto. */
  | { tipo: "APLICAR"; reversas: VariacionStock[] }

/** `saldos` debe incluir a todos los productos de la compra; si falta alguno, es un error. */
export function planificarAnulacion(
  compra: CompraParaAnular,
  saldos: ReadonlyMap<string, number>,
): PlanAnulacion {
  if (compra.estado === "ANULADA") return { tipo: "YA_ANULADA" }

  const reversas = compra.lineas.map((linea) => ({
    productoId: linea.productoId,
    delta: -linea.cantidad,
  }))

  // Se evalua la demanda total por producto: dos lineas del mismo producto compiten por el mismo saldo.
  const faltantes: FaltanteReversion[] = []
  for (const { productoId, delta } of consolidarVariaciones(reversas)) {
    const saldo = saldos.get(productoId)
    if (saldo === undefined) {
      throw new Error("Falta el saldo de un producto de la compra a anular.")
    }
    const resultado = calcularSaldoResultante(saldo, delta)
    if (!resultado.ok) {
      faltantes.push({ productoId, disponible: resultado.disponible, requerido: resultado.requerido })
    }
  }

  return faltantes.length > 0 ? { tipo: "BLOQUEADA", faltantes } : { tipo: "APLICAR", reversas }
}
