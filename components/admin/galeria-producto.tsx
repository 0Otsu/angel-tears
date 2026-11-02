"use client"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ImagenProducto as Image } from "@/components/ui/imagen-producto"
import { MultiFileUploader, type EstadoCola } from "@/components/ui/multi-file-uploader"
import { FileUploader } from "@/components/ui/file-uploader"
import { PendingButton } from "@/components/ui/pending-button"
import { Button } from "@/components/ui/button"
import { MAXIMO_BYTES_IMAGEN, TIPOS_IMAGEN } from "@/lib/modulos/productos/imagen-contrato"
import { MAXIMO_MEDIOS, type GaleriaProducto as DatosGaleria } from "@/lib/modulos/productos/galeria-contrato"
import { leerGaleria, cargarMedio, cambiarMedio, ErrorGaleria } from "@/lib/modulos/productos/galeria-cliente"
import { validarImagenSeleccionada } from "@/lib/modulos/productos/imagen-validacion-cliente"
import { PanelAdmin } from "./piezas-admin"
import { AvisoProductoGuardado } from "./aviso-producto-guardado"

export function GaleriaProducto({ productoId, nombre, version, alGuardar, alCambiarOcupado, alCambiarPendiente, alCambiarGuardando }: {
  productoId: string; nombre: string; version: number; alGuardar: (r: DatosGaleria) => void;
  alCambiarOcupado: (busy: boolean) => void; alCambiarPendiente: (pending: boolean) => void;
  alCambiarGuardando?: (cantidad: number) => void;
}) {
  const [datos, guardar] = useState<DatosGaleria | null>(null), [error, fallar] = useState("")
  const [detalles, guardarDetalles] = useState<Record<string, { nombre: string; tamano: number }>>({})
  const [aviso, notificar] = useState<{ texto: string; numero: number } | null>(null)
  const [bloqueado, bloquear] = useState(false), [cargando, esperar] = useState(true)
  const [reemplazo, reemplazar] = useState<string | null>(null), [comando, procesar] = useState<string | null>(null)
  const [colaBusy, ocuparCola] = useState(false), [reemplazoBusy, ocuparReemplazo] = useState(false)
  const [colaPendiente, pendienteCola] = useState(false), [reemplazoPendiente, pendienteReemplazo] = useState(false)
  const [estadoCola, informarCola] = useState<EstadoCola>({ pendientes: 0, errores: 0 })
  const versionActual = useRef(version), router = useRouter()
  useEffect(() => { versionActual.current = Math.max(versionActual.current, version) }, [version])
  useEffect(() => {
    const aborto = new AbortController()
    leerGaleria(productoId, aborto.signal).then(r => {
      if (aborto.signal.aborted) return
      guardar(r)
      if (r.version !== versionActual.current) { bloquear(true); fallar("El producto cambió desde que lo abriste.") }
    }).catch(() => { if (!aborto.signal.aborted) { bloquear(true); fallar("No pudimos consultar las imágenes.") } }).finally(() => { if (!aborto.signal.aborted) esperar(false) })
    return () => aborto.abort()
  }, [productoId])
  const busy = cargando || colaBusy || reemplazoBusy || comando !== null
  useEffect(() => { alCambiarOcupado(busy) }, [busy, alCambiarOcupado])
  useEffect(() => { alCambiarPendiente(colaPendiente || reemplazoPendiente) }, [colaPendiente, reemplazoPendiente, alCambiarPendiente])
  useEffect(() => { alCambiarGuardando?.(estadoCola.pendientes + (reemplazoBusy ? 1 : 0)) }, [estadoCola.pendientes, reemplazoBusy, alCambiarGuardando])
  function fallo(e: unknown, inline = false) {
    if (!inline) fallar(e instanceof ErrorGaleria ? e.message : "No pudimos confirmar la operación. Recargá los datos actuales.")
    if (!(e instanceof ErrorGaleria) || ["sesion_requerida", "conflicto_version", "version_desactualizada", "error_tecnico", "error_persistencia", "medio_inexistente"].includes(e.codigo)) bloquear(true)
  }
  function confirmar(r: DatosGaleria, texto: string) { versionActual.current = r.version; guardar(r); alGuardar(r); fallar(""); notificar(prev => ({ texto, numero: (prev?.numero ?? 0) + 1 })); router.refresh() }
  async function cambiar(medioId: string, accion: "principal" | "quitar") {
    if (busy || bloqueado) return
    procesar(`${medioId}-${accion}`)
    try { confirmar(await cambiarMedio(productoId, versionActual.current, medioId, accion), accion === "principal" ? "Imagen principal actualizada." : "Imagen quitada.") } catch (e) { fallo(e) } finally { procesar(null) }
  }
  const comunes = { accept: TIPOS_IMAGEN.join(","), maxBytes: MAXIMO_BYTES_IMAGEN, validar: validarImagenSeleccionada,
    instrucciones: "JPEG, PNG o WebP · 3 MiB por imagen · 20 MP.", etiqueta: "Archivo de imagen", altVigente: `Imagen actual de ${nombre}`, textoIdle: "Arrastrá imágenes hasta acá", textoSeleccionar: "Agregar imágenes", textoSubir: "Subir imagen", textoProcesando: "Procesando imagen…", textoElegirOtro: "Elegir otra imagen", textoExito: "Imagen cargada", textoConfirmado: "Imagen cargada" }
  return <PanelAdmin className="space-y-4 p-5" aria-label={`Imagen de ${nombre}`}>
    {aviso && <AvisoProductoGuardado key={aviso.numero} texto={aviso.texto} />}
    <h2 className="text-base font-medium">Imágenes del producto</h2>
    {cargando && <p role="status">Consultando imágenes…</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {bloqueado && <Button className="min-h-11" variant="outline" onClick={() => window.location.reload()}>Recargar datos</Button>}
    {datos && <>
      {datos.limpiezaPendiente && <p role="note">El cambio está guardado. Quedó pendiente limpiar un recurso anterior; requiere conciliación operativa.</p>}
      <ul aria-label="Imágenes guardadas" className="grid gap-4 sm:grid-cols-2">{datos.medios.map((m, i) => <li key={m.id} className="min-w-0 space-y-3 rounded-xl border p-4">
        <Image src={m.urlSegura} sizes="256px" width={m.ancho} height={m.alto} alt={m.principal ? `Imagen actual de ${nombre}` : `Imagen ${i + 1} de ${nombre}`} className="h-36 w-full rounded-lg object-contain" />
        {detalles[m.id] && <p className="break-all text-xs text-muted-foreground">{detalles[m.id].nombre} · {(detalles[m.id].tamano / (1024 * 1024)).toFixed(2)} MiB</p>}
        <div className="flex flex-wrap items-center gap-2"><span className="text-xs text-primary">✓ Cargada</span><p className="text-sm">{m.principal ? "✓ Imagen principal" : `Imagen ${i + 1}`} · {m.formato.toUpperCase()}</p></div>
        <div className="flex flex-wrap gap-2">
          {!m.principal && <PendingButton pending={comando === `${m.id}-principal`} pendingLabel="Actualizando…" disabled={busy || bloqueado || reemplazoPendiente} variant="outline" onClick={() => cambiar(m.id, "principal")}>Hacer principal</PendingButton>}
          <Button disabled={busy || bloqueado || reemplazoPendiente && reemplazo !== m.id} variant="outline" onClick={() => reemplazar(m.id)}>Reemplazar</Button>
          <PendingButton pending={comando === `${m.id}-quitar`} pendingLabel="Quitando…" disabled={busy || bloqueado || reemplazoPendiente} variant="outline" onClick={() => cambiar(m.id, "quitar")}>Quitar imagen</PendingButton>
        </div>
        {reemplazo === m.id && <FileUploader {...comunes} autoUpload enCola showPickerButton={false} showUploadButton={false} textoIdle="Arrastrá una imagen hasta acá" textoCambiar="Elegir reemplazo" disabled={bloqueado || colaBusy || comando !== null}
          alCambiarOcupado={ocuparReemplazo} alCambiarPendiente={pendienteReemplazo}
          upload={async (file, eventos, signal) => { try { const r = await cargarMedio(productoId, versionActual.current, file, eventos, signal, m.id); return { vista: { url: r.medios.find(p => p.id === m.id)!.urlSegura }, resultado: { galeria: r, nombre: file.name, tamano: file.size } } } catch (e) { fallo(e, true); throw e } }}
          onSuccess={r => { guardarDetalles(prev => ({ ...prev, [m.id]: { nombre: r.nombre, tamano: r.tamano } })); confirmar(r.galeria, "Imagen reemplazada."); reemplazar(null); ocuparReemplazo(false); pendienteReemplazo(false) }} />}
      </li>)}</ul>
      <MultiFileUploader {...comunes} autoUpload maxFiles={MAXIMO_MEDIOS} count={datos.medios.length} disabled={bloqueado || reemplazoBusy || comando !== null}
        onBusy={ocuparCola} onPending={pendienteCola} alCambiarCola={informarCola}
        upload={async (file, eventos, signal) => { try { const r = await cargarMedio(productoId, versionActual.current, file, eventos, signal); const nuevo = r.medios.find(m => !datos.medios.some(p => p.id === m.id))!; return { vista: { url: nuevo.urlSegura }, resultado: r } } catch (e) { fallo(e, true); throw e } }}
        onSuccess={(r, file) => { const nuevo = r.medios.find(m => !datos.medios.some(p => p.id === m.id)); if (nuevo) guardarDetalles(prev => ({ ...prev, [nuevo.id]: { nombre: file.name, tamano: file.size } })); confirmar(r, "Imagen cargada.") }} />
    </>}
  </PanelAdmin>
}
