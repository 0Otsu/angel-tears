import { uploadXhr } from "@/lib/upload-xhr"
import { esquemaGaleria } from "./galeria-contrato"
import { esquemaResultadoImagen, mensajesErrorImagen, type CodigoErrorImagen } from "./imagen-contrato"
import type { EventosSubida } from "@/lib/upload-xhr"

export class ErrorGaleria extends Error {
  constructor(readonly codigo: CodigoErrorImagen) { super(mensajesErrorImagen[codigo]) }
}
function interpretar(datos: unknown, status: number) {
  const error = esquemaResultadoImagen.safeParse(datos)
  if (error.success && error.data.estado === "error") throw new ErrorGaleria(error.data.codigo)
  const resultado = esquemaGaleria.safeParse(datos)
  if (status !== 200 || !resultado.success) throw new ErrorGaleria("error_tecnico")
  return resultado.data
}
const ruta = (id: string, medioId?: string) => `/api/admin/productos/${encodeURIComponent(id)}/medios${medioId ? `/${encodeURIComponent(medioId)}` : ""}`
export async function leerGaleria(id: string, signal?: AbortSignal) {
  const respuesta = await fetch(ruta(id), { cache: "no-store", signal })
  return interpretar(await respuesta.json(), respuesta.status)
}
export async function cargarMedio(id: string, version: number, file: File, eventos: EventosSubida, signal: AbortSignal, medioId?: string) {
  const datos = new FormData(); datos.set("imagen", file); datos.set("version", String(version))
  try { return await uploadXhr(ruta(id, medioId), datos, eventos, signal, interpretar, medioId ? "PUT" : "POST") }
  catch (e) { throw e instanceof ErrorGaleria ? e : new ErrorGaleria("error_tecnico") }
}
export async function cambiarMedio(id: string, version: number, medioId: string, accion: "principal" | "quitar") {
  const r = await fetch(`${ruta(id, medioId)}?version=${version}`, { method: accion === "principal" ? "PATCH" : "DELETE" })
  return interpretar(await r.json(), r.status)
}
