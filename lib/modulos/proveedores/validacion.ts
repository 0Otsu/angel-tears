// Validacion de frontera de proveedores (D1, ADR-005): nombre obligatorio y telefono,
// Instagram y observaciones opcionales. No se agregan CUIT, datos bancarios ni domicilio, ni
// unicidad de nombre, ni longitudes maximas: ninguna esta aprobada (pendiente de decision).

import { z } from "zod"

const textoOpcional = z
  .string()
  .trim()
  .transform((valor) => (valor === "" ? null : valor))
  .nullish()
  .transform((valor) => valor ?? null)

export const esquemaProveedor = z.object({
  nombre: z.string({ error: "El nombre es obligatorio." }).trim().min(1, "El nombre es obligatorio."),
  telefono: textoOpcional,
  instagram: textoOpcional,
  nota: textoOpcional,
})

export type DatosProveedor = z.output<typeof esquemaProveedor>
