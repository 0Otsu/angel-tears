import { uploadXhr } from "@/lib/upload-xhr"
import { esquemaResultadoImagen, mensajesErrorImagen, type ResultadoImagen } from "./imagen-contrato"
export function enviarImagenProducto(id: string, datos: FormData, eventos: { alProgreso: (n: number | null) => void; alProcesar: () => void }, signal: AbortSignal, operacion: "primera" | "reemplazo" = "primera"): Promise<ResultadoImagen> {
  const fallo = (): ResultadoImagen => ({ estado: "error", codigo: "error_tecnico", mensaje: mensajesErrorImagen.error_tecnico })
  return uploadXhr(`/api/admin/productos/${encodeURIComponent(id)}/imagen`, datos, eventos, signal, (respuesta, status) => {
    const resultado = esquemaResultadoImagen.safeParse(respuesta)
    if (!resultado.success || resultado.data.estado === "ok" && (status !== 200 || resultado.data.productoId !== id)) return fallo()
    return resultado.data.estado === "error" ? { ...resultado.data, mensaje: mensajesErrorImagen[resultado.data.codigo] } : resultado.data
  }, operacion === "reemplazo" ? "PUT" : "POST").catch(fallo)
}
