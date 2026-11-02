"use client"

import { useEffect, useEffectEvent, useId, useReducer, useRef, type DragEvent } from "react"
import { Upload, Check, ImageIcon } from "lucide-react"
import { Button } from "./button"

export type VistaArchivo = { url: string; nombre?: string; tipo?: string; tamano?: number }
export type EventosSubida = { alProgreso: (porcentaje: number | null) => void; alProcesar: () => void }
export type FaseSubida = "idle" | "drag-over" | "selected" | "validating" | "uploading" | "processing" | "success" | "error" | "retrying"
type Estado = { fase: FaseSubida; anterior: FaseSubida; archivo: File | null; rechazado?: File; preview: string | null; porcentaje: number | null; error: string; arrastrado?: { nombre: string; tamano: number }; confirmada?: { vista: VistaArchivo; base?: string } }
const inicial: Estado = { fase: "idle", anterior: "idle", archivo: null, preview: null, porcentaje: null, error: "" }
type Evento =
  | { tipo: "salir" | "quitar" | "subir" | "procesar" }
  | { tipo: "drag"; archivo?: { nombre: string; tamano: number } }
  | { tipo: "validar"; archivo: File }
  | { tipo: "seleccionar"; preview: string }
  | { tipo: "progreso"; porcentaje: number | null }
  | { tipo: "error"; mensaje: string; validacion?: boolean }
  | { tipo: "exito"; vista: VistaArchivo; base?: string }

export function reducirSubida(estado: Estado, evento: Evento): Estado {
  switch (evento.tipo) {
    case "drag": return estado.fase === "drag-over" ? estado : { ...estado, anterior: estado.fase, fase: "drag-over", arrastrado: evento.archivo }
    case "salir": return estado.fase === "drag-over" ? { ...estado, fase: estado.anterior, arrastrado: undefined } : estado
    case "quitar": return { ...inicial, confirmada: estado.confirmada }
    case "validar": return { ...inicial, confirmada: estado.confirmada, fase: "validating", archivo: evento.archivo }
    case "seleccionar": return { ...estado, fase: "selected", preview: evento.preview }
    case "subir": return { ...estado, fase: estado.fase === "error" ? "retrying" : "uploading", porcentaje: null, error: "" }
    case "progreso": return !["uploading", "retrying"].includes(estado.fase) ? estado : { ...estado, porcentaje: evento.porcentaje === null ? null : Math.max(0, Math.min(100, evento.porcentaje)) }
    case "procesar": return { ...estado, fase: "processing", porcentaje: null }
    case "error": return { ...estado, fase: "error", error: evento.mensaje, porcentaje: null, ...(evento.validacion ? { rechazado: estado.archivo ?? undefined, archivo: null, preview: null } : {}) }
    case "exito": return { ...inicial, fase: "success", confirmada: { vista: evento.vista, base: evento.base } }
  }
}

export type FileUploaderProps<T> = {
  initialFile?: File
  autoUpload?: boolean
  enCola?: boolean
  compact?: boolean
  onPhase?: (fase: FaseSubida) => void
  onRemove?: () => void
  showPickerButton?: boolean
  showUploadButton?: boolean
  accept: string
  maxBytes: number
  instrucciones: string
  etiqueta: string
  textoIdle?: string
  textoSeleccionar?: string
  textoSubir?: string
  textoProcesando?: string
  textoExito?: string
  textoConfirmado?: string
  textoCambiar?: string
  textoElegirOtro?: string
  textoAlternativa?: string
  altVigente?: string
  altLocal?: string
  textoTamanoInvalido?: string
  currentPreview?: VistaArchivo | null
  disabled?: boolean
  validar: (archivo: File, preview: string) => Promise<void>
  upload: (archivo: File, eventos: EventosSubida, signal: AbortSignal) => Promise<{ vista: VistaArchivo; resultado: T }>
  onSuccess: (resultado: T, archivo: File) => void
  onError?: (mensaje: string) => void
  alCambiarOcupado?: (ocupado: boolean) => void
  alCambiarPendiente?: (pendiente: boolean) => void
}
const tamanoLegible = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KiB` : `${(bytes / (1024 * 1024)).toFixed(2)} MiB`

// Solo una seleccion. El caller valida y transporta; no hay endpoints ni reglas comerciales aqui.
export function FileUploader<T>({ initialFile, autoUpload = false, enCola = false, compact = false, onPhase, onRemove, showPickerButton = true, showUploadButton = true, accept, maxBytes, instrucciones, etiqueta, textoIdle = "Arrastrá un archivo hasta acá", textoSeleccionar = "Seleccionar archivo", textoSubir = "Subir archivo", textoProcesando = "Procesando archivo…", textoExito = "Archivo guardado correctamente.", textoConfirmado = "Archivo cargado", textoCambiar = "Cambiar archivo", textoElegirOtro = "Elegir otro archivo", textoAlternativa = "o elegilo desde tu dispositivo", altVigente = "Archivo vigente", altLocal = "Vista previa local seleccionada", textoTamanoInvalido = "El archivo supera el tamaño permitido.", currentPreview, disabled = false, validar, upload, onSuccess, onError, alCambiarOcupado, alCambiarPendiente }: FileUploaderProps<T>) {
  const [estado, enviar] = useReducer(reducirSubida, inicial)
  const [edicion, editar] = useReducer(() => true, false)
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const url = useRef<string | null>(null)
  const secuencia = useRef(0)
  const control = useRef<AbortController | null>(null)
  const profundidad = useRef(0)
  const inicializado = useRef<File | null>(null)
  const ocupado = ["validating", "uploading", "retrying", "processing"].includes(estado.fase)
  const transfiriendo = ["uploading", "retrying", "processing"].includes(estado.fase)
  const bloqueado = ocupado || disabled
  const propia = estado.confirmada
  const vigente = propia && (!currentPreview || currentPreview.url === propia.base || currentPreview.url === propia.vista.url) ? propia.vista : currentPreview
  const mostrarSelector = !vigente || edicion && estado.fase !== "success"
  const seleccionado = estado.archivo ?? estado.rechazado
  useEffect(() => { alCambiarOcupado?.(ocupado) }, [ocupado, alCambiarOcupado])
  useEffect(() => { alCambiarPendiente?.(estado.archivo !== null || enCola && Boolean(estado.rechazado)) }, [estado.archivo, estado.rechazado, enCola, alCambiarPendiente])
  useEffect(() => () => { secuencia.current++; inicializado.current = null; control.current?.abort(); if (url.current) URL.revokeObjectURL(url.current) }, [])

  const iniciarArchivo = useEffectEvent((archivo: File) => { void seleccionar(archivo) })
  const enviarAutomatico = useEffectEvent(() => { void subir() })
  useEffect(() => {
    if (initialFile && !disabled && inicializado.current !== initialFile) {
      inicializado.current = initialFile
      iniciarArchivo(initialFile)
    }
  }, [initialFile, disabled])
  useEffect(() => { if (autoUpload && estado.fase === "selected") enviarAutomatico() }, [autoUpload, estado.fase])
  useEffect(() => { onPhase?.(estado.fase) }, [estado.fase, onPhase])

  function liberar() { if (url.current) URL.revokeObjectURL(url.current); url.current = null }
  function quitar() { if (transfiriendo) return; secuencia.current++; liberar(); profundidad.current = 0; enviar({ tipo: "quitar" }); onRemove?.() }
  async function seleccionar(archivo: File) {
    if (bloqueado) return
    const turno = ++secuencia.current
    liberar(); profundidad.current = 0
    enviar({ tipo: "validar", archivo })
    try {
      if (archivo.size > maxBytes) throw new Error(textoTamanoInvalido)
      const local = URL.createObjectURL(archivo)
      url.current = local
      await validar(archivo, local)
      if (turno !== secuencia.current) return
      enviar({ tipo: "seleccionar", preview: local })
    } catch (error) {
      if (turno !== secuencia.current) return
      liberar()
      const mensaje = error instanceof Error ? error.message : "No pudimos validar el archivo."
      enviar({ tipo: "error", mensaje, validacion: true }); onError?.(mensaje)
    }
  }
  async function subir() {
    if (!estado.archivo || bloqueado) return
    const archivo = estado.archivo, turno = secuencia.current
    const aborto = new AbortController(); control.current = aborto
    enviar({ tipo: "subir" })
    let recibido: Awaited<ReturnType<FileUploaderProps<T>["upload"]>>
    try {
      recibido = await upload(archivo, {
        alProgreso: porcentaje => { if (turno === secuencia.current) enviar({ tipo: "progreso", porcentaje }) },
        alProcesar: () => { if (turno === secuencia.current) enviar({ tipo: "procesar" }) },
      }, aborto.signal)
    } catch (error) {
      if (turno !== secuencia.current) return
      const mensaje = error instanceof Error ? error.message : "No pudimos completar la carga."
      enviar({ tipo: "error", mensaje }); onError?.(mensaje)
      return
    }
    if (turno !== secuencia.current) return
    liberar()
    enviar({ tipo: "exito", vista: { nombre: archivo.name, tipo: archivo.type, tamano: archivo.size, ...recibido.vista }, base: currentPreview?.url })
    onSuccess(recibido.resultado, archivo)
  }
  function feedbackArrastre(e: DragEvent<HTMLDivElement>) {
    const archivo = e.dataTransfer.files?.[0]
    enviar({ tipo: "drag", archivo: archivo ? { nombre: archivo.name, tamano: archivo.size } : undefined })
  }
  function soltar(e: DragEvent<HTMLDivElement>) {
    e.preventDefault(); profundidad.current = 0
    if (bloqueado) return
    const archivos = e.dataTransfer.files
    if (archivos.length !== 1) { quitar(); enviar({ tipo: "error", mensaje: "Seleccioná un solo archivo.", validacion: true }); return }
    void seleccionar(archivos[0])
  }
  const mensajes: Record<FaseSubida, string> = { retrying: estado.porcentaje === null ? "Reintentando archivo…" : `Reenviando archivo: ${estado.porcentaje} %`, idle: "Todavía no seleccionaste un archivo.", "drag-over": "Soltá para cargar", selected: "Archivo seleccionado. Listo para subir.", validating: "Validando el archivo seleccionado…", uploading: estado.porcentaje === null ? "Subiendo archivo…" : `Enviando archivo: ${estado.porcentaje} %`, processing: textoProcesando, success: textoExito, error: "No se pudo completar la carga." }
  const estadoCola = estado.fase === "idle" ? initialFile ? "Pendiente" : "" : estado.fase === "selected" ? "Pendiente" : estado.fase === "validating" ? "Validando…" : estado.fase === "uploading" || estado.fase === "retrying" ? estado.porcentaje === null ? "Subiendo…" : `Subiendo ${estado.porcentaje} %` : estado.fase === "processing" ? "Procesando…" : estado.fase === "error" ? "Error" : estado.fase === "success" ? "Cargada" : mensajes[estado.fase]
  return <div data-estado={estado.fase} className="min-w-0 space-y-4">
    <p role="status" aria-live="polite" className={compact && !ocupado && !enCola ? "sr-only" : "text-sm"}>{enCola ? estadoCola : estado.fase === "error" ? "" : mensajes[estado.fase]}</p>
    {vigente && <div className="grid min-w-0 grid-cols-[4rem_minmax(0,1fr)] items-center gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4 sm:flex sm:flex-wrap sm:gap-4">
      {/* Las previews son URLs locales o persistidas aportadas por el caller. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={vigente.url} alt={altVigente} className="h-16 w-16 rounded-lg object-contain sm:h-24 sm:w-24" />
      <div className="min-w-0 flex-1 space-y-1"><p className="flex items-center gap-2 text-sm font-medium"><Check className="size-4 text-primary" aria-hidden="true" />{textoConfirmado}</p>
        {vigente.nombre && <p className="break-all text-sm">{vigente.nombre}</p>}
        <p className="text-xs text-muted-foreground">{vigente.tipo || "Tipo no disponible"}{vigente.tamano !== undefined ? ` · ${tamanoLegible(vigente.tamano)}` : ""}</p>
      </div>
      <Button type="button" variant="outline" className="col-span-2 w-full sm:w-auto" disabled={bloqueado} onClick={() => { quitar(); editar() }}>{textoCambiar}</Button>
    </div>}
    {mostrarSelector && <>
      <label htmlFor={id} className="sr-only">{etiqueta}</label>
      <input ref={input} id={id} type="file" accept={accept} disabled={bloqueado} className="sr-only" tabIndex={-1} aria-describedby={`${id}-ayuda`} onChange={e => { const elegido = e.target.files?.[0]; e.target.value = ""; if (elegido) void seleccionar(elegido) }} />
      {!compact && <div role="button" tabIndex={bloqueado ? -1 : 0} aria-label="Seleccionar archivo para cargar" aria-disabled={bloqueado} aria-describedby={`${id}-ayuda`}
        onClick={() => { if (!bloqueado) input.current?.click() }} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (!bloqueado) input.current?.click() } }}
        onDragEnter={e => { e.preventDefault(); if (!bloqueado) { profundidad.current++; feedbackArrastre(e) } }}
        onDragOver={e => { e.preventDefault(); if (!bloqueado) { e.dataTransfer.dropEffect = "copy"; feedbackArrastre(e) } }}
        onDragLeave={() => { profundidad.current = Math.max(0, profundidad.current - 1); if (!profundidad.current) enviar({ tipo: "salir" }) }} onDrop={soltar}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-[background-color,border-color,box-shadow] duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${estado.fase === "drag-over" ? "border-primary bg-primary/10 ring-4 ring-primary/10" : "border-border bg-card/30"} ${bloqueado ? "cursor-not-allowed opacity-60" : ""}`}>
        <Upload className="mx-auto mb-3 size-7 text-primary" aria-hidden="true" />
        <p className="font-medium">{estado.fase === "drag-over" ? "Soltá para cargar" : textoIdle}</p>
        <p className="mt-1 text-sm text-muted-foreground">{estado.fase === "drag-over" ? "Un solo archivo" : textoAlternativa}</p>
        {estado.fase === "drag-over" && estado.arrastrado && <p className="mt-2 break-all text-xs">{estado.arrastrado.nombre} · {tamanoLegible(estado.arrastrado.tamano)}</p>}
      </div>}
      <p id={`${id}-ayuda`} className={compact ? "sr-only" : "text-xs text-muted-foreground"}>{instrucciones}</p>
      {seleccionado && <div className={`flex min-w-0 items-center gap-4 ${compact ? "" : "rounded-xl border border-border p-3"}`}>
        {estado.preview && seleccionado.type.startsWith("image/") ? <>
          <span className="sr-only">Vista previa local sin guardar</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={estado.preview} alt={altLocal} className="h-20 w-20 shrink-0 rounded-lg object-contain" />
        </> : <ImageIcon className="size-8 shrink-0 text-primary" aria-hidden="true" />}
        <div className="min-w-0 space-y-1"><p className="break-all text-sm font-medium">{seleccionado.name}</p><p className="break-all text-xs text-muted-foreground">{seleccionado.type || "Tipo no informado"} · {tamanoLegible(seleccionado.size)}</p>{!compact && <p className="text-xs">Selección local · todavía no guardada</p>}</div>
      </div>}
      {transfiriendo && <div className="space-y-2"><progress aria-label="Progreso de envío" max={100} value={["uploading", "retrying"].includes(estado.fase) && estado.porcentaje !== null ? estado.porcentaje : undefined} className="h-2 w-full appearance-none overflow-hidden rounded-full bg-primary/10 accent-primary [&::-webkit-progress-bar]:bg-primary/10 [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-value]:transition-[width] [&::-webkit-progress-value]:duration-150 motion-reduce:[&::-webkit-progress-value]:transition-none [&::-webkit-progress-value]:bg-primary [&::-webkit-progress-value]:rounded-full [&::-moz-progress-bar]:bg-primary" /></div>}
      {estado.error && <div className="space-y-2"><p role="alert" className="text-sm text-destructive">{estado.error}</p>{estado.archivo && <p className="text-xs text-muted-foreground">{compact ? "Se volverá a enviar desde el inicio." : "Conservamos el archivo. Reintentar lo vuelve a enviar completo desde el inicio."}</p>}</div>}
      <div className="flex flex-wrap gap-2">
        {estado.archivo && estado.fase !== "validating" && (showUploadButton || estado.fase === "error") && <Button className="min-h-11" type="button" disabled={bloqueado} onClick={() => void subir()}>{estado.fase === "error" ? "Reintentar" : textoSubir}</Button>}
        {!enCola && (showPickerButton || !compact && (estado.archivo || estado.fase === "error")) && <Button className="min-h-11" type="button" variant="outline" disabled={bloqueado} onClick={() => input.current?.click()}>{estado.archivo || estado.fase === "error" ? textoElegirOtro : textoSeleccionar}</Button>}
        {(seleccionado || edicion) && <Button className="min-h-11" type="button" variant="outline" disabled={transfiriendo} onClick={quitar}>{compact ? "Quitar archivo" : "Quitar selección"}</Button>}
      </div>
    </>}
  </div>
}
