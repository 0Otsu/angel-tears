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

// Solo categorias y metadatos permitidos: nunca el error crudo, mensaje, URL o respuesta SDK.
function informarFalloSubida(error: unknown, etapa: "sdk" | "respuesta" | "referencia", entorno: Record<string, string | undefined>) {
  const fallo = error as { http_code?: unknown; code?: unknown; message?: unknown } | null
  const http = typeof fallo?.http_code === "number" && Number.isInteger(fallo.http_code) && fallo.http_code >= 100 && fallo.http_code <= 599 ? fallo.http_code : undefined
  const mensaje = typeof fallo?.message === "string" ? fallo.message : ""
  const codigoRed = ["ENOTFOUND", "EAI_AGAIN", "ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "CERT_HAS_EXPIRED", "SELF_SIGNED_CERT_IN_CHAIN"].find(codigo => codigo === fallo?.code)
  const categoria = etapa !== "sdk" ? "respuesta_no_valida" : codigoRed ? "comunicacion" : /invalid signature/i.test(mensaje) ? "firma_rechazada" : /(?:unknown|invalid) api[_ ]?key/i.test(mensaje) ? "clave_api_rechazada" : /(?:unknown|invalid) cloud[_ ]?name/i.test(mensaje) ? "cuenta_rechazada" : http === 401 || http === 403 ? "autenticacion_o_permisos" : "fallo_sdk"
  console.error("[productos.imagen] fallo Cloudinary", {
    etapa, categoria, http, codigoRed,
    configuracionPresente: {
      CLOUDINARY_CLOUD_NAME: Boolean(entorno.CLOUDINARY_CLOUD_NAME?.trim()),
      CLOUDINARY_API_KEY: Boolean(entorno.CLOUDINARY_API_KEY?.trim()),
      CLOUDINARY_API_SECRET: Boolean(entorno.CLOUDINARY_API_SECRET?.trim()),
    },
  })
}

export function crearAlmacenCloudinary(entorno: Record<string, string | undefined> = process.env): AlmacenImagen {
  function configuracion() {
    const datos = { cloud_name: entorno.CLOUDINARY_CLOUD_NAME, api_key: entorno.CLOUDINARY_API_KEY, api_secret: entorno.CLOUDINARY_API_SECRET }
    if (Object.values(datos).some((valor) => !valor?.trim() || valor.includes("<"))) throw new ErrorImagen("servicio_no_disponible", 503)
    return datos
  }
  return {
    async almacenarImagen({ contenido, publicId }) {
      const config = configuracion()
      let etapa: "sdk" | "respuesta" | "referencia" = "sdk"
      try {
        const respuesta = await new Promise<unknown>((resolver, rechazar) => {
          const stream = cloudinary.uploader.upload_stream({ ...config, public_id: publicId, resource_type: "image", overwrite: false, timeout: 30_000 },
            (error, resultado) => error ? rechazar(error) : resolver(resultado))
          stream.on("error", rechazar)
          stream.end(Buffer.from(contenido))
        })
        etapa = "respuesta"
        const datos = esquemaRespuesta.parse(respuesta)
        etapa = "referencia"
        const url = new URL(datos.secure_url)
        if (datos.public_id !== publicId || url.protocol !== "https:" || url.hostname !== "res.cloudinary.com" || url.username || url.password
          || !url.pathname.startsWith(`/${config.cloud_name}/image/upload/`)) throw new Error("Respuesta de imagen no valida")
        return esquemaReferenciaImagen.parse({ assetId: datos.asset_id, publicId: datos.public_id, versionProveedor: String(datos.version),
          urlSegura: datos.secure_url, ancho: datos.width, alto: datos.height, formato: datos.format })
      } catch (error) {
        informarFalloSubida(error, etapa, entorno)
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
