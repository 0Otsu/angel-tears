// Reglas puras de ajuste de stock (B3, B4, B5): incremento/decremento entero con motivo
// obligatorio, o saldo inicial identificado. Nunca reemplaza el saldo: siempre produce un delta.
// Las restricciones sobre cuando se puede cargar el saldo inicial no estan aprobadas (pendiente,
// ver design.md): aqui no se inventa ninguna.

import { esCantidadPositiva } from "@/lib/modulos/inventario/reglas-stock"

export const TIPOS_AJUSTE = ["INICIAL", "INCREMENTO", "DECREMENTO"] as const
export type TipoAjuste = (typeof TIPOS_AJUSTE)[number]

export type AjusteEntrada = {
  readonly tipo: unknown
  readonly cantidad: unknown
  readonly motivo: unknown
}

export type ErrorAjuste = {
  readonly campo: "tipo" | "cantidad" | "motivo"
  readonly codigo: "REQUERIDO" | "TIPO_INVALIDO" | "CANTIDAD_INVALIDA"
}

export type ResultadoAjuste =
  | { ok: true; tipo: TipoAjuste; cantidad: number; motivo: string; delta: number }
  | { ok: false; errores: ErrorAjuste[] }

function esTipoAjuste(valor: unknown): valor is TipoAjuste {
  return (TIPOS_AJUSTE as readonly unknown[]).includes(valor)
}

export function evaluarAjuste(entrada: AjusteEntrada): ResultadoAjuste {
  const errores: ErrorAjuste[] = []

  if (!esTipoAjuste(entrada.tipo)) errores.push({ campo: "tipo", codigo: "TIPO_INVALIDO" })
  if (!esCantidadPositiva(entrada.cantidad)) {
    errores.push({ campo: "cantidad", codigo: "CANTIDAD_INVALIDA" })
  }
  const motivo = typeof entrada.motivo === "string" ? entrada.motivo.trim() : ""
  if (motivo === "") errores.push({ campo: "motivo", codigo: "REQUERIDO" })

  if (errores.length > 0) return { ok: false, errores }

  const tipo = entrada.tipo as TipoAjuste
  const cantidad = entrada.cantidad as number
  // Solo el decremento resta; el inicial suma existencias previas sin compra ni efecto economico.
  return { ok: true, tipo, cantidad, motivo, delta: tipo === "DECREMENTO" ? -cantidad : cantidad }
}
