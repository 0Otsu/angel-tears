"use client"

import { useEffect, useId, useRef, useState, type DragEvent } from "react"
import Link from "next/link"
import NextImage from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { MAXIMO_BYTES_IMAGEN, MAXIMO_PIXELES_IMAGEN, TIPOS_IMAGEN, mensajesErrorImagen, type ResultadoImagen } from "@/lib/modulos/productos/imagen-contrato"
import { enviarImagenProducto } from "@/lib/modulos/productos/imagen-cliente"
import { PanelAdmin, TituloPanel } from "./piezas-admin"

type Estado = "vacio" | "seleccionado" | "validando" | "subiendo" | "procesando" | "exito" | "error" | "reintento"

export function CargaImagenProducto({ productoId, nombre, version, tieneImagen }: { productoId: string; nombre: string; version: number; tieneImagen: boolean }) {
  const [estado, setEstado] = useState<Estado>("vacio")
  const [arrastrando, setArrastrando] = useState(false)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [sesionVencida, setSesionVencida] = useState(false)
  const [imagenDetectada, setImagenDetectada] = useState(false)
  const [porcentaje, setPorcentaje] = useState<number | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const previewActual = useRef<string | null>(null)
  const secuencia = useRef(0)
  const peticion = useRef<AbortController | null>(null)
  const id = useId()
  const router = useRouter()
  const ocupado = ["validando", "subiendo", "procesando", "reintento"].includes(estado)

  useEffect(() => () => {
    secuencia.current++
    peticion.current?.abort()
    if (previewActual.current) URL.revokeObjectURL(previewActual.current)
  }, [])

  async function seleccionar(candidato: File) {
    if (ocupado || tieneImagen) return
    const turno = ++secuencia.current
    setArrastrando(false)
    setError("")
    setSesionVencida(false)
    setArchivo(null)
    setPreview(null)
    if (previewActual.current) URL.revokeObjectURL(previewActual.current)
    previewActual.current = null
    setEstado("validando")
    let url: string | null = null
    try {
      if (candidato.size > MAXIMO_BYTES_IMAGEN) throw new Error(mensajesErrorImagen.exceso_bytes)
      if (candidato.type && !(TIPOS_IMAGEN as readonly string[]).includes(candidato.type)) throw new Error(mensajesErrorImagen.tipo_invalido)
      url = URL.createObjectURL(candidato)
      const temporal = new Image()
      await new Promise<void>((resolver, rechazar) => {
        temporal.onload = () => resolver()
        temporal.onerror = () => rechazar(new Error(mensajesErrorImagen.imagen_corrupta))
        temporal.src = url!
      })
      if (temporal.naturalWidth * temporal.naturalHeight > MAXIMO_PIXELES_IMAGEN) throw new Error(mensajesErrorImagen.exceso_pixeles)
      if (turno !== secuencia.current) { URL.revokeObjectURL(url); return }
      previewActual.current = url
      setPreview(url)
      setArchivo(candidato)
      setEstado("seleccionado")
    } catch (fallo) {
      if (url) URL.revokeObjectURL(url)
      if (turno !== secuencia.current) return
      setError(fallo instanceof Error ? fallo.message : mensajesErrorImagen.imagen_corrupta)
      setEstado("error")
    }
  }

  async function subir(reintentar = false) {
    if (!archivo || ocupado || tieneImagen) return
    const turno = secuencia.current
    const control = new AbortController()
    peticion.current = control
    setEstado(reintentar ? "reintento" : "subiendo")
    setError("")
    setPorcentaje(null)
    const datos = new FormData()
    datos.set("version", String(version))
    datos.set("imagen", archivo)
    let resultado: ResultadoImagen
    try { resultado = await enviarImagenProducto(productoId, datos, {
      alProgreso: (valor) => { if (turno === secuencia.current) { setPorcentaje(valor); setEstado("subiendo") } },
      alProcesar: () => { if (turno === secuencia.current) setEstado("procesando") },
    }, control.signal) } catch { resultado = { estado: "error", codigo: "error_tecnico", mensaje: mensajesErrorImagen.error_tecnico } }
    if (turno !== secuencia.current) return
    if (resultado.estado === "ok") {
      setEstado("exito")
      router.refresh()
    } else {
      setError(resultado.mensaje)
      setSesionVencida(resultado.codigo === "sesion_requerida")
      setImagenDetectada(resultado.codigo === "imagen_existente")
      setEstado("error")
    }
  }

  function soltar(evento: DragEvent<HTMLDivElement>) {
    evento.preventDefault()
    setArrastrando(false)
    if (ocupado || tieneImagen) return
    const archivos = evento.dataTransfer.files
    if (archivos.length !== 1) {
      setArchivo(null); setPreview(null)
      if (previewActual.current) URL.revokeObjectURL(previewActual.current)
      previewActual.current = null
      setError("Seleccioná una sola imagen."); setEstado("error"); return
    }
    void seleccionar(archivos[0])
  }

  const mensajes: Record<Estado, string> = {
    vacio: "Todavía no seleccionaste una imagen.", seleccionado: "Archivo seleccionado. Listo para subir.",
    validando: "Validando el archivo seleccionado…", subiendo: porcentaje === null ? "Subiendo imagen…" : `Enviando archivo: ${porcentaje} %`,
    procesando: "Archivo enviado. Validando y guardando la imagen…", exito: "Imagen principal guardada correctamente.",
    error: "No se pudo completar la carga.", reintento: "Reintentando la carga…",
  }
  const guardada = tieneImagen || imagenDetectada || estado === "exito"

  return <PanelAdmin className="space-y-4 pb-6" aria-label={`Imagen de ${nombre}`}>
    <TituloPanel titulo="Imagen principal" detalle="La imagen es opcional mientras el producto permanezca oculto. Será necesaria para publicarlo." />
    <div className="space-y-4 px-5 lg:px-6">
      <p aria-live="polite" role="status" className="text-sm">{arrastrando ? "Soltá la imagen para seleccionarla." : guardada && estado !== "exito" ? "Este producto ya tiene una imagen principal. Este control solo permite la primera carga." : mensajes[estado]}</p>
      {!guardada && <>
        <div role="group" aria-label="Seleccionar imagen principal" onDragOver={(e) => { e.preventDefault(); if (!ocupado) setArrastrando(true) }}
          onDragLeave={(e) => { if (!(e.relatedTarget instanceof Node) || !e.currentTarget.contains(e.relatedTarget)) setArrastrando(false) }} onDrop={soltar}
          className={`rounded-xl border-2 border-dashed p-5 focus-within:ring-2 focus-within:ring-primary ${arrastrando ? "border-primary bg-primary/5" : "border-border"}`}>
          <label htmlFor={id} className="sr-only">Archivo de imagen principal</label>
          <input ref={input} id={id} type="file" accept={TIPOS_IMAGEN.join(",")} disabled={ocupado} className="sr-only" aria-describedby={`${id}-ayuda`} onChange={(e) => {
            const candidato = e.target.files?.[0]
            e.target.value = ""
            if (candidato) void seleccionar(candidato)
          }} />
          <p className="mb-3 text-sm">Arrastrá una imagen hasta acá o elegila desde tu dispositivo.</p>
          <Button type="button" variant="outline" disabled={ocupado} onClick={() => input.current?.click()}>Seleccionar imagen</Button>
          <p id={`${id}-ayuda`} className="mt-3 text-xs text-muted-foreground">Una imagen JPEG, PNG o WebP. Hasta 3 MiB y 20 megapíxeles.</p>
        </div>
        {archivo && <p className="break-all text-sm">Archivo: {archivo.name}</p>}
      </>}
      {preview && <div className="max-w-sm overflow-hidden rounded-xl border border-border">
        <NextImage unoptimized src={preview} width={400} height={300} alt={`Vista previa de la imagen seleccionada para ${nombre}`} className="max-h-64 w-full object-contain" />
      </div>}
      {(estado === "subiendo" || estado === "reintento" || estado === "procesando") && <div className="space-y-2">
        <progress aria-label="Progreso de envío de imagen" max={100} value={estado === "subiendo" && porcentaje !== null ? porcentaje : undefined} className="w-full accent-primary" />
        <p className="text-xs text-muted-foreground">El porcentaje corresponde al envío. La confirmación de guardado se muestra al terminar.</p>
      </div>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {sesionVencida && <Link href="/admin/login" className="text-sm underline">Iniciar sesión</Link>}
      {!guardada && archivo && <Button type="button" disabled={ocupado || sesionVencida} onClick={() => void subir(estado === "error")}>{estado === "error" ? "Reintentar carga" : "Subir imagen"}</Button>}
    </div>
  </PanelAdmin>
}
