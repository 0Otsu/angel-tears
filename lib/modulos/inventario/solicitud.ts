// Idempotencia de operaciones (ADR-003): una clave de solicitud identifica una operacion
// logica, no un intento de red. La misma clave con el mismo contenido recupera el resultado ya
// confirmado; la misma clave con otro contenido es un conflicto. Puro: la busqueda de la
// operacion existente la hace cada modulo con su unique en la base.

import { createHash } from "node:crypto"

type Json = null | boolean | number | string | Json[] | { [clave: string]: Json }

function canonico(valor: Json): string {
  if (Array.isArray(valor)) return `[${valor.map(canonico).join(",")}]`
  if (valor !== null && typeof valor === "object") {
    const claves = Object.keys(valor).sort()
    return `{${claves.map((c) => `${JSON.stringify(c)}:${canonico(valor[c])}`).join(",")}}`
  }
  return JSON.stringify(valor)
}

/**
 * Huella estable del contenido de una solicitud: no depende del orden de las claves. Si el
 * orden de un arreglo importa (por ejemplo, las lineas de una compra), se conserva.
 */
export function calcularHuellaSolicitud(contenido: Json): string {
  return createHash("sha256").update(canonico(contenido)).digest("hex")
}

export type EstadoSolicitud = "NUEVA" | "REPETIDA" | "CONFLICTO"

/** `huellaExistente` es la de la operacion ya registrada con la misma clave, o null si no hay. */
export function clasificarSolicitud(
  huellaExistente: string | null,
  huellaActual: string,
): EstadoSolicitud {
  if (huellaExistente === null) return "NUEVA"
  return huellaExistente === huellaActual ? "REPETIDA" : "CONFLICTO"
}
