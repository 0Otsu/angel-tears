import { esquemaReferenciaImagen, type ReferenciaImagen } from "../../lib/modulos/productos/imagen-contrato"
import { urlCloudinaryVersionada } from "../../lib/imagen-delivery"
import { PRODUCTOS_DEMO } from "./plan"
import { ErrorDemo } from "./seguridad"

/** Solo referencias aportadas por el responsable; no inventa assets ni hace uploads/fetch. */
export function validarImagenesDemo(entrada: unknown, cloudName: string | undefined): Record<string, ReferenciaImagen> {
  if (!cloudName || !/^[a-zA-Z0-9_-]+$/.test(cloudName) || !entrada || typeof entrada !== "object" || Array.isArray(entrada)) {
    throw new ErrorDemo("Falta el manifiesto de imagenes autorizadas y el cloud name exclusivo de demo.")
  }
  const imagenes: Record<string, ReferenciaImagen> = {}
  const conocidos = new Set(PRODUCTOS_DEMO.map(p => p.id)), recursos = new Set<string>()
  for (const [id, valor] of Object.entries(entrada)) {
    const resultado = esquemaReferenciaImagen.safeParse(valor)
    if (!conocidos.has(id) || !resultado.success) throw new ErrorDemo("Referencia de imagen de demo invalida.")
    const imagen = resultado.data, url = urlCloudinaryVersionada(imagen.urlSegura)
    if (!imagen.publicId.startsWith(`angel-tears/demo-20261118/productos/${id}/`)
      || !url || url.pathname !== `/${cloudName}/image/upload/v${imagen.versionProveedor}/${imagen.publicId}.${imagen.formato === "jpeg" ? "jpg" : imagen.formato}`
      || recursos.has(imagen.publicId)) throw new ErrorDemo("La imagen no pertenece al cloud/prefijo de demo o esta duplicada.")
    recursos.add(imagen.publicId)
    imagenes[id] = imagen
  }
  if (PRODUCTOS_DEMO.some(p => p.publicar && !imagenes[p.id])) {
    throw new ErrorDemo("Faltan imagenes autorizadas para productos que deben publicarse. No se cargaran datos incompletos.")
  }
  return imagenes
}
