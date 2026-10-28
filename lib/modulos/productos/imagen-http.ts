import { z } from "zod"
import { esErrorSesionRequerida, type ExigirAdministradora } from "@/lib/modulos/autenticacion/contrato"
import { ErrorImagen, MAXIMO_BYTES_IMAGEN, MAXIMO_BYTES_MULTIPART, mensajesErrorImagen, type ImagenGuardada } from "./imagen-contrato"

async function multipartAcotado(request: Request) {
  const tipo = request.headers.get("content-type") ?? ""
  if (!tipo.toLowerCase().startsWith("multipart/form-data;")) throw new ErrorImagen("solicitud_invalida", 400)
  const longitud = request.headers.get("content-length")
  if (longitud && (!/^\d+$/.test(longitud) || Number(longitud) > MAXIMO_BYTES_MULTIPART)) throw new ErrorImagen("exceso_bytes", 413)
  const lector = request.body?.getReader()
  if (!lector) throw new ErrorImagen("solicitud_invalida", 400)
  const trozos: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const { done, value } = await lector.read()
      if (done) break
      total += value.byteLength
      if (total > MAXIMO_BYTES_MULTIPART) {
        await lector.cancel()
        throw new ErrorImagen("exceso_bytes", 413)
      }
      trozos.push(value)
    }
  } finally { lector.releaseLock() }
  const bytes = new Uint8Array(total)
  let posicion = 0
  for (const trozo of trozos) { bytes.set(trozo, posicion); posicion += trozo.byteLength }
  try { return await new Response(bytes, { headers: { "content-type": tipo } }).formData() } catch { throw new ErrorImagen("solicitud_invalida", 400) }
}

export function crearManejadorImagenProducto(dependencias: {
  exigir: ExigirAdministradora
  origen: () => string | undefined
  adjuntar: (encabezados: Headers, referencia: unknown, contenido: Uint8Array) => Promise<ImagenGuardada>
  alGuardar: () => void
}) {
  return async function atender(request: Request, id: string): Promise<Response> {
    const cabeceras = { "cache-control": "no-store" }
    try {
      await dependencias.exigir(request.headers)
      const origen = dependencias.origen()
      if (!origen || request.headers.get("origin") !== new URL(origen).origin) throw new ErrorImagen("origen_invalido", 403)
      if (!z.uuid().safeParse(id).success) throw new ErrorImagen("solicitud_invalida", 400)
      const datos = await multipartAcotado(request)
      if (datos.getAll("imagen").length !== 1 || datos.getAll("version").length !== 1
        || [...datos.keys()].some((clave) => clave !== "imagen" && clave !== "version")) throw new ErrorImagen("solicitud_invalida", 400)
      const archivo = datos.get("imagen")
      if (!(archivo instanceof File)) throw new ErrorImagen("solicitud_invalida", 400)
      if (archivo.size > MAXIMO_BYTES_IMAGEN) throw new ErrorImagen("exceso_bytes", 413)
      // Nombre, extension y MIME del File no autorizan el formato: se decodifica en Productos.
      const resultado = await dependencias.adjuntar(request.headers, { id, version: datos.get("version") }, new Uint8Array(await archivo.arrayBuffer()))
      dependencias.alGuardar()
      return Response.json(resultado, { headers: cabeceras })
    } catch (error) {
      const controlado = esErrorSesionRequerida(error) ? new ErrorImagen("sesion_requerida", 401) : error instanceof ErrorImagen ? error : new ErrorImagen("error_tecnico", 500)
      if (!(error instanceof ErrorImagen) && !esErrorSesionRequerida(error)) console.error("[productos.imagen] fallo de carga", { tipo: error instanceof Error ? error.name : typeof error })
      return Response.json({ estado: "error", codigo: controlado.codigo, mensaje: mensajesErrorImagen[controlado.codigo] }, { status: controlado.status, headers: cabeceras })
    }
  }
}
