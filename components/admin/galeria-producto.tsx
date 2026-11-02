"use client"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { MultiFileUploader } from "@/components/ui/multi-file-uploader"
import { FileUploader } from "@/components/ui/file-uploader"
import { PendingButton } from "@/components/ui/pending-button"
import { Button } from "@/components/ui/button"
import { MAXIMO_BYTES_IMAGEN, TIPOS_IMAGEN } from "@/lib/modulos/productos/imagen-contrato"
import { MAXIMO_MEDIOS, type GaleriaProducto as DatosGaleria } from "@/lib/modulos/productos/galeria-contrato"
import { leerGaleria, cargarMedio, cambiarMedio, ErrorGaleria } from "@/lib/modulos/productos/galeria-cliente"
import { validarImagenSeleccionada } from "@/lib/modulos/productos/imagen-validacion-cliente"
import { PanelAdmin, TituloPanel } from "./piezas-admin"

export function GaleriaProducto({ productoId, nombre, version, alGuardar, alCambiarOcupado, alCambiarPendiente }: {
  productoId: string; nombre: string; version: number; alGuardar: (r: DatosGaleria) => void;
  alCambiarOcupado: (busy: boolean) => void; alCambiarPendiente: (pending: boolean) => void;
}) {
  const [datos, guardar] = useState<DatosGaleria | null>(null), [error, fallar] = useState("")
  const [detalles, guardarDetalles] = useState<Record<string, { nombre: string; tamano: number }>>({})
  const [bloqueado, bloquear] = useState(false), [cargando, esperar] = useState(true)
  const [reemplazo, reemplazar] = useState<string | null>(null), [comando, procesar] = useState<string | null>(null)
  const [colaBusy, ocuparCola] = useState(false), [reemplazoBusy, ocuparReemplazo] = useState(false)
  const [colaPendiente, pendienteCola] = useState(false), [reemplazoPendiente, pendienteReemplazo] = useState(false)
  const versionActual = useRef(version), router = useRouter()
  useEffect(() => { versionActual.current = Math.max(versionActual.current, version) }, [version])
  useEffect(() => {
    const aborto = new AbortController()
    leerGaleria(productoId, aborto.signal).then(r => {
      if (aborto.signal.aborted) return
      guardar(r)
      if (r.version !== versionActual.current) { bloquear(true); fallar("El producto cambió. Recargá los datos actuales antes de continuar.") }
    }).catch(() => { if (!aborto.signal.aborted) { bloquear(true); fallar("No pudimos consultar las imágenes. Recargá los datos actuales.") } }).finally(() => { if (!aborto.signal.aborted) esperar(false) })
    return () => aborto.abort()
  }, [productoId])
  const busy = cargando || colaBusy || reemplazoBusy || comando !== null
  useEffect(() => { alCambiarOcupado(busy) }, [busy, alCambiarOcupado])
  useEffect(() => { alCambiarPendiente(colaPendiente || reemplazoPendiente) }, [colaPendiente, reemplazoPendiente, alCambiarPendiente])
  function fallo(e: unknown, inline = false) {
    if (!inline) fallar(e instanceof ErrorGaleria ? e.message : "No pudimos confirmar la operación. Recargá los datos actuales.")
    if (!(e instanceof ErrorGaleria) || ["sesion_requerida", "conflicto_version", "version_desactualizada", "error_tecnico", "error_persistencia", "medio_inexistente"].includes(e.codigo)) bloquear(true)
  }
  function confirmar(r: DatosGaleria) { versionActual.current = r.version; guardar(r); alGuardar(r); fallar(""); router.refresh() }
  async function cambiar(medioId: string, accion: "principal" | "quitar") {
    if (busy || bloqueado) return
    procesar(`${medioId}-${accion}`)
    try { confirmar(await cambiarMedio(productoId, versionActual.current, medioId, accion)) } catch (e) { fallo(e) } finally { procesar(null) }
  }
  const comunes = { accept: TIPOS_IMAGEN.join(","), maxBytes: MAXIMO_BYTES_IMAGEN, validar: validarImagenSeleccionada,
    instrucciones: "JPEG, PNG o WebP · 3 MiB por imagen · 20 MP. Video no disponible en esta versión.", etiqueta: "Archivo de imagen", altVigente: `Imagen actual de ${nombre}`, textoSubir: "Subir imagen", textoProcesando: "Procesando imagen…", textoElegirOtro: "Elegir otra imagen", textoExito: "Imagen cargada", textoConfirmado: "Imagen cargada" }
  return <PanelAdmin className="space-y-4 p-5" aria-label={`Imagen de ${nombre}`}>
    <TituloPanel titulo="Imágenes del producto" detalle="Hasta siete imágenes. La principal se usa en catálogo y SEO; podés guardar el producto oculto sin imágenes." />
    {cargando && <p role="status">Consultando imágenes…</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {bloqueado && <Button variant="outline" onClick={() => window.location.reload()}>Recargar datos actuales</Button>}
    {datos && <>
      {datos.limpiezaPendiente && <p role="note">El cambio está guardado. Quedó pendiente limpiar un recurso anterior; requiere conciliación operativa.</p>}
      <ul aria-label="Imágenes guardadas" className="grid gap-4 sm:grid-cols-2">{datos.medios.map((m, i) => <li key={m.id} className="min-w-0 space-y-3 rounded-xl border p-4">
        <Image unoptimized src={m.urlSegura} width={m.ancho} height={m.alto} alt={m.principal ? `Imagen actual de ${nombre}` : `Imagen ${i + 1} de ${nombre}`} className="h-36 w-full rounded-lg object-contain" />
        <p className="text-xs text-primary">✓ Cargado</p>
        {detalles[m.id] && <p className="break-all text-xs text-muted-foreground">{detalles[m.id].nombre} · {(detalles[m.id].tamano / (1024 * 1024)).toFixed(2)} MiB</p>}
        <p className="text-sm">{m.principal ? "✓ Imagen principal" : `Imagen ${i + 1}`} · {m.formato.toUpperCase()}</p>
        <div className="flex flex-wrap gap-2">
          {!m.principal && <PendingButton pending={comando === `${m.id}-principal`} pendingLabel="Actualizando…" disabled={busy || bloqueado || reemplazoPendiente} variant="outline" onClick={() => cambiar(m.id, "principal")}>Hacer principal</PendingButton>}
          <Button disabled={busy || bloqueado || reemplazoPendiente && reemplazo !== m.id} variant="outline" onClick={() => reemplazar(m.id)}>Reemplazar</Button>
          <PendingButton pending={comando === `${m.id}-quitar`} pendingLabel="Quitando…" disabled={busy || bloqueado || reemplazoPendiente} variant="outline" onClick={() => cambiar(m.id, "quitar")}>Quitar imagen</PendingButton>
        </div>
        {reemplazo === m.id && <FileUploader {...comunes} textoCambiar="Elegir reemplazo" textoSubir="Guardar reemplazo" disabled={bloqueado || colaBusy || comando !== null}
          alCambiarOcupado={ocuparReemplazo} alCambiarPendiente={pendienteReemplazo}
          upload={async (file, eventos, signal) => { try { const r = await cargarMedio(productoId, versionActual.current, file, eventos, signal, m.id); return { vista: { url: r.medios.find(p => p.id === m.id)!.urlSegura }, resultado: { galeria: r, nombre: file.name, tamano: file.size } } } catch (e) { fallo(e, true); throw e } }}
          onSuccess={r => { guardarDetalles(prev => ({ ...prev, [m.id]: { nombre: r.nombre, tamano: r.tamano } })); confirmar(r.galeria); reemplazar(null); ocuparReemplazo(false); pendienteReemplazo(false) }} />}
      </li>)}</ul>
      <MultiFileUploader {...comunes} maxFiles={MAXIMO_MEDIOS} count={datos.medios.length} disabled={bloqueado || reemplazoBusy || comando !== null}
        onBusy={ocuparCola} onPending={pendienteCola}
        upload={async (file, eventos, signal) => { try { const r = await cargarMedio(productoId, versionActual.current, file, eventos, signal); const nuevo = r.medios.find(m => !datos.medios.some(p => p.id === m.id))!; return { vista: { url: nuevo.urlSegura }, resultado: r } } catch (e) { fallo(e, true); throw e } }}
        onSuccess={(r, file) => { const nuevo = r.medios.find(m => !datos.medios.some(p => p.id === m.id)); if (nuevo) guardarDetalles(prev => ({ ...prev, [nuevo.id]: { nombre: file.name, tamano: file.size } })); confirmar(r) }} />
    </>}
  </PanelAdmin>
}
