import { z } from "zod"
import { centavosADecimal, decimalACentavos } from "@/lib/modulos/compras/dinero"

// PostgreSQL no admite anio cero, aunque forme parte del formato ISO extendido.
const fecha = z.iso.date("Ingresá una fecha válida.").refine(v => !v.startsWith("0000-"), "Ingresá una fecha válida.")

// Limite tecnico numeric(18,2), no un tope comercial arbitrario. Rechaza antes del cast SQL.
const importe = z.string().trim().regex(/^\d{1,16}(?:\.\d{1,2})?$/, "Ingresá un importe en ARS con hasta dos decimales, usando punto.")
  .refine(v => { const c = decimalACentavos(v); return c !== null && c > BigInt(0) }, "El importe debe ser mayor que cero.")
  .transform(v => centavosADecimal(decimalACentavos(v)!))

export const entradaEgreso = z.object({
  concepto: z.string().trim().min(1, "Ingresá un concepto."),
  importe,
  fechaOperacion: fecha,
  nota: z.string().trim().nullish().transform(v => v || null),
  claveSolicitud: z.uuid("Recargá la página e intentá de nuevo."),
})

export const filtroEgresos = z.object({
  desde: z.union([fecha, z.literal(""), z.null()]).optional().transform(v => v || null),
  hasta: z.union([fecha, z.literal(""), z.null()]).optional().transform(v => v || null),
  estado: z.enum(["CONFIRMADO", "ANULADO", ""], "Elegí un estado válido.").optional(),
  limite: z.preprocess(v => typeof v === "string" && /^\d{1,3}$/.test(v) ? Number(v) : v, z.number().int().min(1).max(200).default(50)),
}).refine(f => !f.desde || !f.hasta || f.desde <= f.hasta, { path: ["hasta"], message: "La fecha final no puede ser anterior a la inicial." })

export function erroresPorCampo(error: z.ZodError) {
  return Object.fromEntries(error.issues.map(i => [String(i.path[0]), i.message]))
}

/** Mes comercial, no UTC ni reloj del navegador. Rango inclusivo por fecha de operacion. */
export function mesActualEgresos(ahora = new Date()) {
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Cordoba", year: "numeric", month: "2-digit" }).formatToParts(ahora)
  const anio = partes.find(p => p.type === "year")!.value
  const mes = partes.find(p => p.type === "month")!.value
  const ultimo = new Date(Date.UTC(Number(anio), Number(mes), 0)).getUTCDate()
  return { desde: `${anio}-${mes}-01`, hasta: `${anio}-${mes}-${ultimo}` }
}
