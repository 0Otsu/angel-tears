import { esquemaResultadoImagen, mensajesErrorImagen, type ResultadoImagen } from "./imagen-contrato"

export function enviarImagenProducto(id: string, datos: FormData, eventos: {
  alProgreso: (porcentaje: number | null) => void
  alProcesar: () => void
}, signal: AbortSignal, operacion: "primera" | "reemplazo" = "primera"): Promise<ResultadoImagen> {
  return new Promise((resolver) => {
    const xhr = new XMLHttpRequest()
    const fallar = () => resolver({ estado: "error", codigo: "error_tecnico", mensaje: mensajesErrorImagen.error_tecnico })
    const cancelar = () => xhr.abort()
    xhr.open(operacion === "reemplazo" ? "PUT" : "POST", `/api/admin/productos/${encodeURIComponent(id)}/imagen`)
    xhr.timeout = 60_000 // Plazo de red real; no interviene en el progreso ni simula estados.
    xhr.upload.onprogress = (evento) => eventos.alProgreso(evento.lengthComputable && evento.total > 0 ? Math.min(100, Math.round(evento.loaded * 100 / evento.total)) : null)
    xhr.upload.onload = () => eventos.alProcesar()
    xhr.onerror = fallar
    xhr.ontimeout = fallar
    xhr.onabort = fallar
    xhr.onload = () => {
      try {
        const resultado = esquemaResultadoImagen.safeParse(JSON.parse(xhr.responseText))
        if (!resultado.success || (resultado.data.estado === "ok" && (xhr.status !== 200 || resultado.data.productoId !== id))) return fallar()
        // Solo mensajes propios: nunca mostrar un cuerpo arbitrario devuelto por un proxy.
        resolver(resultado.data.estado === "error" ? { ...resultado.data, mensaje: mensajesErrorImagen[resultado.data.codigo] } : resultado.data)
      } catch { fallar() }
    }
    xhr.onloadend = () => signal.removeEventListener("abort", cancelar)
    if (signal.aborted) return fallar()
    signal.addEventListener("abort", cancelar, { once: true })
    xhr.send(datos)
  })
}
