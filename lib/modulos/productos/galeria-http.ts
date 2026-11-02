import { z } from "zod"
import { crearManejadorImagenProducto } from "./imagen-http"
import { crearGaleriaProductos } from "./galeria-servicio"
import { ErrorImagen, mensajesErrorImagen, type ImagenGuardada } from "./imagen-contrato"
import { esErrorSesionRequerida } from "@/lib/modulos/autenticacion/contrato"

type Dependencias = Parameters<typeof crearGaleriaProductos>[0] & { origen: () => string | undefined; alGuardar: () => void }
export function crearManejadorGaleria(d: Dependencias) {
  const servicio = crearGaleriaProductos(d)
  const subir = (medioId?: string) => crearManejadorImagenProducto({
    exigir: d.exigir, origen: d.origen,
    adjuntar: async (h, ref, bytes) => {
      const resultado = await servicio.guardar(h, ref, bytes, medioId)
      if (!resultado.imagen) throw new ErrorImagen("error_tecnico", 500)
      return resultado as ImagenGuardada
    }, alGuardar: d.alGuardar,
  })
  return async (request: Request, id: string, medioId?: string) => {
    const headers = { "cache-control": "no-store" }
    try {
      await d.exigir(request.headers)
      if (!z.uuid().safeParse(id).success || medioId && !z.uuid().safeParse(medioId).success) throw new ErrorImagen("solicitud_invalida", 400)
      if (request.method === "GET") return Response.json(await servicio.consultar(request.headers, id), { headers })
      const origen = d.origen()
      if (!origen || request.headers.get("origin") !== new URL(origen).origin) throw new ErrorImagen("origen_invalido", 403)
      if (request.method === "POST" && !medioId || request.method === "PUT" && medioId) return subir(medioId)(request, id)
      if (!medioId || !["PATCH", "DELETE"].includes(request.method)) throw new ErrorImagen("solicitud_invalida", 400)
      const resultado = await servicio.cambiar(request.headers, { id, version: new URL(request.url).searchParams.get("version") }, medioId, request.method === "PATCH" ? "principal" : "quitar")
      d.alGuardar()
      return Response.json(resultado, { headers })
    } catch (error) {
      const fallo = esErrorSesionRequerida(error) ? new ErrorImagen("sesion_requerida", 401) : error instanceof ErrorImagen ? error : new ErrorImagen("error_tecnico", 500)
      return Response.json({ estado: "error", codigo: fallo.codigo, mensaje: mensajesErrorImagen[fallo.codigo] }, { status: fallo.status, headers })
    }
  }
}
