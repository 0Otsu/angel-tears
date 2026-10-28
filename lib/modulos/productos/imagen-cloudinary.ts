import "server-only"
import { v2 as cloudinary } from "cloudinary"
import { z } from "zod"
import { ErrorImagen, MAXIMO_BYTES_IMAGEN, esquemaReferenciaImagen, type AlmacenImagen } from "./imagen-contrato"

const esquemaRespuesta = z.object({
  asset_id: z.string().min(1), public_id: z.string().min(1), version: z.number().int().positive(),
  secure_url: z.url(), width: z.number().int().positive(), height: z.number().int().positive(),
  format: z.enum(["jpg", "jpeg", "png", "webp"]).transform((formato) => formato === "jpg" ? "jpeg" as const : formato), resource_type: z.literal("image"),
  bytes: z.number().int().positive().max(MAXIMO_BYTES_IMAGEN),
})

export function crearAlmacenCloudinary(entorno: Record<string, string | undefined> = process.env): AlmacenImagen {
  function configuracion() {
    const datos = { cloud_name: entorno.CLOUDINARY_CLOUD_NAME, api_key: entorno.CLOUDINARY_API_KEY, api_secret: entorno.CLOUDINARY_API_SECRET }
    if (Object.values(datos).some((valor) => !valor?.trim() || valor.includes("<"))) throw new ErrorImagen("servicio_no_disponible", 503)
    return datos
  }
  return {
    async almacenarImagen({ contenido, publicId }) {
      const config = configuracion()
      try {
        const respuesta = await new Promise<unknown>((resolver, rechazar) => {
          const stream = cloudinary.uploader.upload_stream({ ...config, public_id: publicId, resource_type: "image", overwrite: false, timeout: 30_000 },
            (error, resultado) => error ? rechazar(error) : resolver(resultado))
          stream.on("error", rechazar)
          stream.end(Buffer.from(contenido))
        })
        const datos = esquemaRespuesta.parse(respuesta)
        const url = new URL(datos.secure_url)
        if (datos.public_id !== publicId || url.protocol !== "https:" || url.hostname !== "res.cloudinary.com" || url.username || url.password
          || !url.pathname.startsWith(`/${config.cloud_name}/image/upload/`)) throw new Error("Respuesta de imagen no valida")
        return esquemaReferenciaImagen.parse({ assetId: datos.asset_id, publicId: datos.public_id, versionProveedor: String(datos.version),
          urlSegura: datos.secure_url, ancho: datos.width, alto: datos.height, formato: datos.format })
      } catch {
        throw new ErrorImagen("error_proveedor", 502)
      }
    },
    async eliminarImagen(publicId) {
      const config = configuracion()
      try {
        const opciones = { ...config, resource_type: "image" as const, invalidate: true, timeout: 30_000 }
        const respuesta = await cloudinary.uploader.destroy(publicId, opciones)
        if (respuesta.result !== "ok" && respuesta.result !== "not found") throw new Error("Limpieza no confirmada")
      } catch { throw new ErrorImagen("error_proveedor", 502) }
    },
  }
}
