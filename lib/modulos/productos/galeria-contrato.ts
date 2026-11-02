import { z } from "zod"
import { esquemaReferenciaImagen } from "./imagen-contrato"
export const MAXIMO_MEDIOS = 7
export const esquemaMedio = z.object({ id: z.uuid(), tipo: z.literal("imagen"), orden: z.number().int().min(1).max(7), principal: z.boolean() }).and(esquemaReferenciaImagen)
export type MedioProducto = z.infer<typeof esquemaMedio>
export const esquemaGaleria = z.object({ estado: z.literal("ok"), productoId: z.uuid(), version: z.number().int().positive(), medios: z.array(esquemaMedio).max(7), imagen: esquemaReferenciaImagen.nullable(), limpiezaPendiente: z.boolean().optional() })
export type GaleriaProducto = z.infer<typeof esquemaGaleria>
