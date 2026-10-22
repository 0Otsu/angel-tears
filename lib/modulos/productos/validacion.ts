import { z } from "zod"
import { CODIGOS_CATEGORIA } from "@/lib/modulos/productos/categorias"

/**
 * Formato de almacenamiento numeric(18,2), no politica comercial de precios. No redondea,
 * no usa float y no resuelve si cero/negativos estan permitidos: falta esa decision antes
 * de habilitar altas/ediciones desde UI. Los signos se conservan en esta capa tecnica.
 */
export function normalizarPrecioDecimal(texto: string): string | null {
  const partes = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(texto)
  if (!partes) return null
  const enteros = partes[2].replace(/^0+(?=\d)/, "")
  if (enteros.length > 16) return null
  const decimales = (partes[3] ?? "").padEnd(2, "0")
  const signo = partes[1] && (enteros !== "0" || decimales !== "00") ? "-" : ""
  return `${signo}${enteros}.${decimales}`
}

const textoOpcional = z.string().trim().nullish().transform((valor) => valor || null)

export const esquemaDatosProducto = z.object({
  nombre: z.string({ error: "El nombre es obligatorio." }).trim().min(1, "El nombre es obligatorio."),
  precio: z.string({ error: "El precio es obligatorio." }).transform((texto, contexto) => {
    const precio = normalizarPrecioDecimal(texto)
    if (precio === null) {
      contexto.addIssue({ code: "custom", message: "Ingresá un decimal válido de hasta dos posiciones, dentro de numeric(18,2)." })
      return z.NEVER
    }
    return precio
  }),
  categoriaCodigo: z.enum(CODIGOS_CATEGORIA, { error: "Elegí una categoría de la lista aprobada." }),
  descripcion: textoOpcional,
  material: textoOpcional,
  medida: textoOpcional,
  color: textoOpcional,
  cuidados: textoOpcional,
})

export type DatosProducto = z.output<typeof esquemaDatosProducto>
export const esquemaIdsProducto = z.array(z.uuid()).transform((ids) => [...new Set(ids)])
