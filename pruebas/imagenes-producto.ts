import sharp from "sharp"
import type { AlmacenImagen, ReferenciaImagen } from "@/lib/modulos/productos/imagen-contrato"

// Archivos minimos generados por un encoder real, exclusivamente para pruebas.
export const crearImagenPrueba = (formato: "jpeg" | "png" | "webp" = "png", width = 12, height = 8) =>
  sharp({ create: { width, height, channels: 3, background: "#a0a06e" } }).toFormat(formato).toBuffer()

export function referenciaImagenPrueba(publicId: string): ReferenciaImagen {
  return { assetId: `asset-${publicId}`, publicId, versionProveedor: "1", urlSegura: "https://res.cloudinary.com/pruebas/image/upload/v1/imagen.png", ancho: 12, alto: 8, formato: "png" }
}

export function almacenImagenPrueba(): AlmacenImagen {
  return { almacenarImagen: async ({ publicId }) => referenciaImagenPrueba(publicId), eliminarImagen: async () => {} }
}
