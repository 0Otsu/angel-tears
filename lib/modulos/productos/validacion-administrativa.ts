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

export const esquemaExistenciasIniciales = z.object({
  stockInicial: z.preprocess((valor) => {
    if (valor == null || (typeof valor === "string" && !valor.trim())) return 0
    if (typeof valor === "string" && /^\d+$/.test(valor.trim())) return Number(valor)
    return valor
  }, z.int32({ error: "Ingresá una cantidad entera entre 0 y 2.147.483.647." })
    .nonnegative({ error: "El stock inicial no puede ser negativo." })),
  claveSolicitud: z.uuid({ error: "La referencia del alta no es válida. Recargá la página." })
    .transform((clave) => clave.toLowerCase()).nullish(),
})

export function erroresProducto(error: z.ZodError): Record<string, string> {
  const errores: Record<string, string> = {}
  for (const problema of error.issues) errores[String(problema.path[0] ?? "formulario")] ??= problema.message
  return errores
}
