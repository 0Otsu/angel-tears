import { z } from "zod"
import { esquemaDatosProducto } from "./validacion"

// Decision expresa del responsable para 2.1: precio de venta estrictamente mayor que cero.
// Se reutiliza el formato exacto de P0; no se modifica la representacion tecnica compartida.
export const esquemaProductoAdministrativo = esquemaDatosProducto.refine(
  (datos) => !datos.precio.startsWith("-") && datos.precio !== "0.00",
  { path: ["precio"], message: "El precio debe ser mayor que cero." },
)

export const esquemaReferenciaEdicion = z.object({
  id: z.uuid({ error: "La referencia del producto no es válida." }),
  version: z.coerce.number().int().positive(),
})

export function erroresProducto(error: z.ZodError): Record<string, string> {
  const errores: Record<string, string> = {}
  for (const problema of error.issues) errores[String(problema.path[0] ?? "formulario")] ??= problema.message
  return errores
}
