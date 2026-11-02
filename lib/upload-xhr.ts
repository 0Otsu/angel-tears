export type EventosSubida = { alProgreso: (n: number | null) => void; alProcesar: () => void }
// Transporte de archivos independiente del dominio. No interpreta respuestas ni simula progreso.
export function uploadXhr<T>(url: string, datos: FormData, eventos: { alProgreso: (n: number | null) => void; alProcesar: () => void }, signal: AbortSignal, interpretar: (datos: unknown, status: number) => T, metodo = "POST"): Promise<T> {
  return new Promise((resolver, rechazar) => {
    const xhr = new XMLHttpRequest()
    const fallar = () => rechazar(new Error("No se pudo confirmar la transferencia."))
    const cancelar = () => xhr.abort()
    xhr.open(metodo, url); xhr.timeout = 60000
    xhr.upload.onprogress = e => eventos.alProgreso(e.lengthComputable && e.total > 0 ? Math.min(100, Math.round(e.loaded * 100 / e.total)) : null)
    xhr.upload.onload = eventos.alProcesar
    xhr.onerror = fallar; xhr.ontimeout = fallar; xhr.onabort = fallar
    xhr.onload = () => { try { resolver(interpretar(JSON.parse(xhr.responseText), xhr.status)) } catch (error) { rechazar(error) } }
    xhr.onloadend = () => signal.removeEventListener("abort", cancelar)
    if (signal.aborted) return fallar()
    signal.addEventListener("abort", cancelar, { once: true }); xhr.send(datos)
  })
}
