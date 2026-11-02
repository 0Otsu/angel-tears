"use client"
import { useEffect, useId, useRef, useState } from "react"
import { Upload } from "lucide-react"
import { FileUploader, type FileUploaderProps, type FaseSubida } from "./file-uploader"
import { Button } from "./button"

// Cola pequena sobre el mismo control/validacion/progreso por archivo, sin endpoints ni dominio.
export type EstadoCola = { pendientes: number; errores: number }
export function MultiFileUploader<T>({ maxFiles, count = 0, autoUpload = false, onSuccess, onBusy, onPending, alCambiarCola, ...props }: Omit<FileUploaderProps<T>, "initialFile" | "onSuccess" | "onPhase" | "autoUpload"> & {
  maxFiles: number; count?: number; onSuccess: (resultado: T, archivo: File) => void;
  autoUpload?: boolean; alCambiarCola?: (estado: EstadoCola) => void;
  onBusy?: (busy: boolean) => void; onPending?: (pending: boolean) => void;
}) {
  const [archivos, cambiar] = useState<{ id: string; archivo: File; fase: FaseSubida }[]>([])
  const [enviar, activar] = useState(false)
  const [drag, arrastrar] = useState(false)
  const [error, fallar] = useState("")
  const input = useRef<HTMLInputElement>(null), profundidad = useRef(0), id = useId()
  const activo = archivos.find(a => ["uploading", "retrying", "processing"].includes(a.fase))
  const cabeza = archivos.find(a => a.fase !== "error" && a.fase !== "success")
  const siguiente = activo ?? ((autoUpload || enviar) && cabeza?.fase === "selected" ? cabeza : undefined)
  const busy = Boolean(activo) || archivos.some(a => a.fase === "validating")
  useEffect(() => { onBusy?.(busy) }, [busy, onBusy])
  useEffect(() => { onPending?.(archivos.length > 0) }, [archivos.length, onPending])
  const errores = archivos.filter(a => a.fase === "error").length
  const pendientes = archivos.length - errores
  useEffect(() => { alCambiarCola?.({ pendientes, errores }) }, [pendientes, errores, alCambiarCola])
  function seleccionar(lista: FileList | null) {
    profundidad.current = 0; arrastrar(false)
    if (!lista || props.disabled) return
    if (count + archivos.length + lista.length > maxFiles) { fallar(`Se admite un máximo de ${maxFiles} archivos en total. Esta selección no se agregó.`); return }
    // FileList es vivo y el input se limpia al terminar onChange. Capturar los File
    // antes de ceder a React; el updater debe ser puro, incluso en Strict Mode.
    const nuevos = Array.from(lista).map(archivo => ({ id: crypto.randomUUID(), archivo, fase: "idle" as const }))
    fallar(""); activar(false)
    cambiar(prev => [...prev, ...nuevos])
  }
  function fase(id: string, nueva: FaseSubida) { cambiar(prev => prev.find(a => a.id === id)?.fase === nueva ? prev : prev.map(a => a.id === id ? { ...a, fase: nueva } : a)) }
  return <div className="min-w-0 space-y-4">
    <input ref={input} id={id} type="file" multiple accept={props.accept} disabled={props.disabled} className="sr-only" tabIndex={-1} aria-label="Archivos para cargar" onChange={e => { seleccionar(e.target.files); e.target.value = "" }} />
    {count + archivos.length < maxFiles && <div role="button" tabIndex={props.disabled ? -1 : 0} aria-disabled={props.disabled} aria-label="Agregar archivos" aria-describedby={`${id}-ayuda`}
      onClick={() => { if (!props.disabled) input.current?.click() }}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (!props.disabled) input.current?.click() } }}
      onDragEnter={e => { e.preventDefault(); if (!props.disabled) { profundidad.current++; arrastrar(true) } }}
      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "copy" }}
      onDragLeave={() => { profundidad.current = Math.max(0, profundidad.current - 1); if (!profundidad.current) arrastrar(false) }}
      onDrop={e => { e.preventDefault(); seleccionar(e.dataTransfer.files) }}
      className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-primary ${drag ? "border-primary bg-primary/10 ring-4 ring-primary/10" : "border-border bg-card/30"}`}>
      <Upload aria-hidden="true" className="mx-auto mb-3 size-7 text-primary" />
      <p className="font-medium">{drag ? "Soltá para agregar" : count || archivos.length ? props.textoSeleccionar ?? "Agregar archivos" : props.textoIdle ?? "Arrastrá imágenes hasta acá"}</p>
      <p className="text-sm text-muted-foreground">o hacé clic para seleccionarlas</p>
    </div>}
    <p id={`${id}-ayuda`} className="text-xs text-muted-foreground">Hasta {maxFiles} archivos. {props.instrucciones}</p>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {!autoUpload && archivos.some(a => a.fase === "selected") && <Button className="min-h-11" type="button" disabled={props.disabled || busy} onClick={() => { fallar(""); activar(true) }}>Subir archivos</Button>}
    <ul aria-label="Archivos seleccionados" className="space-y-4">{archivos.map(a => <li key={a.id} className="min-w-0 rounded-xl border p-4">
      <FileUploader {...props} initialFile={a.archivo} etiqueta={`${props.etiqueta}: ${a.archivo.name}`} compact showPickerButton={false} showUploadButton={false} enCola={autoUpload}
        disabled={props.disabled || Boolean(activo && activo.id !== a.id)} autoUpload={siguiente?.id === a.id}
        onPhase={nueva => fase(a.id, nueva)} onRemove={() => { fallar(""); cambiar(prev => prev.filter(p => p.id !== a.id)) }}
        onSuccess={(resultado, archivo) => { fallar(""); onSuccess(resultado, archivo); cambiar(prev => prev.filter(p => p.id !== a.id)) }} />
    </li>)}</ul>
  </div>
}
