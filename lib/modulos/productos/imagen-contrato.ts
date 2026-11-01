import { z } from "zod"

export const MAXIMO_BYTES_IMAGEN = 3 * 1024 * 1024
export const MAXIMO_PIXELES_IMAGEN = 20_000_000
export const MAXIMO_BYTES_MULTIPART = MAXIMO_BYTES_IMAGEN + 64 * 1024
export const TIPOS_IMAGEN = ["image/jpeg", "image/png", "image/webp"] as const

export const esquemaReferenciaImagen = z.object({
  assetId: z.string().min(1), publicId: z.string().min(1), versionProveedor: z.string().min(1),
  urlSegura: z.url().refine((url) => new URL(url).protocol === "https:"),
  ancho: z.number().int().positive(), alto: z.number().int().positive(),
  formato: z.enum(["jpeg", "png", "webp"]),
}).refine((imagen) => imagen.ancho * imagen.alto <= MAXIMO_PIXELES_IMAGEN)
export type ReferenciaImagen = z.infer<typeof esquemaReferenciaImagen>

export interface AlmacenImagen {
  almacenarImagen(entrada: { contenido: Uint8Array; publicId: string }): Promise<ReferenciaImagen>
  eliminarImagen(publicId: string): Promise<void>
}

export const mensajesErrorImagen = {
  sesion_requerida: "Tu sesión venció. Volvé a iniciar sesión antes de subir la imagen.",
  origen_invalido: "No se pudo autorizar esta solicitud. Recargá la página e intentá nuevamente.",
  solicitud_invalida: "La solicitud de imagen no es válida. Seleccioná el archivo nuevamente.",
  producto_inexistente: "El producto no está disponible.",
  imagen_existente: "El producto ya tiene una imagen principal. Este control solo permite la primera carga.",
  conflicto_version: "El producto cambió durante la carga. Recargá el listado antes de continuar.",
  tipo_invalido: "Elegí una imagen JPEG, PNG o WebP.",
  imagen_corrupta: "No pudimos leer esa imagen. Elegí un archivo válido.",
  exceso_bytes: "La imagen supera el máximo de 3 MiB.",
  exceso_pixeles: "La imagen supera el máximo de 20 megapíxeles.",
  servicio_no_disponible: "La carga de imágenes no está disponible en este momento. Intentá más tarde.",
  error_proveedor: "No pudimos almacenar la imagen. Podés reintentar.",
  error_tecnico: "No pudimos confirmar el guardado. Recargá el listado antes de reintentar.",
} as const
export type CodigoErrorImagen = keyof typeof mensajesErrorImagen

export class ErrorImagen extends Error {
  constructor(readonly codigo: CodigoErrorImagen, readonly status: number) {
    super(mensajesErrorImagen[codigo])
    this.name = "ErrorImagen"
  }
}

export const esquemaResultadoImagen = z.discriminatedUnion("estado", [
  z.object({ estado: z.literal("ok"), productoId: z.uuid(), version: z.number().int().positive(), imagen: esquemaReferenciaImagen }),
  z.object({ estado: z.literal("error"), codigo: z.enum(Object.keys(mensajesErrorImagen) as [CodigoErrorImagen, ...CodigoErrorImagen[]]), mensaje: z.string() }),
])
export type ResultadoImagen = z.infer<typeof esquemaResultadoImagen>
export type ImagenGuardada = Extract<ResultadoImagen, { estado: "ok" }>
