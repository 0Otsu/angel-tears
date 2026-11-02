"use client"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { FileUploader } from "@/components/ui/file-uploader"
import { MAXIMO_BYTES_IMAGEN, TIPOS_IMAGEN, mensajesErrorImagen, type ImagenGuardada, type ResultadoImagen } from "@/lib/modulos/productos/imagen-contrato"
import { enviarImagenProducto } from "@/lib/modulos/productos/imagen-cliente"
import { validarImagenSeleccionada } from "@/lib/modulos/productos/imagen-validacion-cliente"
import { PanelAdmin, TituloPanel } from "./piezas-admin"
type ImagenActual = { urlSegura: string; ancho: number; alto: number; formato?: string }
export function CargaImagenProducto({ productoId, nombre, version, tieneImagen, imagenActual = null, alGuardar, alCambiarOcupado, alCambiarPendiente, alRecargar }: {
 productoId: string; nombre: string; version: number; tieneImagen: boolean; imagenActual?: ImagenActual | null;
 alGuardar?: (resultado: ImagenGuardada) => void; alCambiarOcupado?: (ocupado: boolean) => void; alCambiarPendiente?: (pendiente: boolean) => void; alRecargar?: () => void
}) {
 const [confirmada, setConfirmada] = useState<ImagenGuardada | null>(null)
 const [sesionVencida, setSesionVencida] = useState(false)
 const [recargaRequerida, setRecargaRequerida] = useState(false)
 const [ultimoReemplazo, setUltimoReemplazo] = useState(false)
 const router = useRouter()
 const vigente = confirmada && confirmada.version >= version ? confirmada.imagen : imagenActual
 const versionVigente = Math.max(version, confirmada?.version ?? 0)
 const existente = tieneImagen || confirmada !== null
 return <PanelAdmin className="space-y-4 pb-6" aria-label={`Imagen de ${nombre}`}>
  <TituloPanel titulo="Imagen principal" detalle="La imagen es opcional mientras el producto permanezca oculto. Será necesaria para publicarlo." />
  <div className="space-y-4 px-5 lg:px-6">
   {existente && !vigente ? <p role="status">Este producto ya tiene una imagen principal. Recargá los datos actuales para verla.</p> : <FileUploader<ImagenGuardada>
    accept={TIPOS_IMAGEN.join(",")} maxBytes={MAXIMO_BYTES_IMAGEN} etiqueta="Archivo de imagen principal"
    instrucciones="Una imagen JPEG, PNG o WebP. Hasta 3 MiB y 20 megapíxeles."
    textoIdle="Arrastrá una imagen hasta acá" textoAlternativa="o elegila desde tu dispositivo"
    textoSeleccionar="Seleccionar imagen" textoElegirOtro="Elegir otra imagen" textoCambiar="Cambiar imagen"
    textoSubir={existente ? "Guardar nueva imagen" : "Subir imagen"} textoProcesando="Procesando imagen…"
    textoExito={ultimoReemplazo ? "Imagen principal reemplazada correctamente." : "Imagen principal guardada correctamente."}
    textoConfirmado="Imagen cargada" textoTamanoInvalido={mensajesErrorImagen.exceso_bytes}
    altVigente={`Imagen actual de ${nombre}`} altLocal={`Vista previa de la imagen seleccionada para ${nombre}`}
    currentPreview={vigente ? { url: vigente.urlSegura, tipo: vigente.formato ? `image/${vigente.formato}` : "Imagen persistida" } : null}
    disabled={sesionVencida || recargaRequerida} validar={validarImagenSeleccionada}
    alCambiarOcupado={alCambiarOcupado} alCambiarPendiente={alCambiarPendiente}
    upload={async (archivo, eventos, signal) => {
     const datos = new FormData(); datos.set("version", String(versionVigente)); datos.set("imagen", archivo)
     let respuesta: ResultadoImagen
     try { respuesta = await enviarImagenProducto(productoId, datos, eventos, signal, existente ? "reemplazo" : "primera") }
     catch { respuesta = { estado: "error", codigo: "error_tecnico", mensaje: mensajesErrorImagen.error_tecnico } }
     if (respuesta.estado === "error") {
      setSesionVencida(respuesta.codigo === "sesion_requerida")
      setRecargaRequerida(["conflicto_version", "version_desactualizada", "imagen_existente", "imagen_requerida", "error_tecnico", "error_persistencia"].includes(respuesta.codigo))
      throw new Error(mensajesErrorImagen[respuesta.codigo])
     }
     setUltimoReemplazo(existente)
     return { vista: { url: respuesta.imagen.urlSegura, tipo: `image/${respuesta.imagen.formato}` }, resultado: respuesta }
    }}
    onSuccess={resultado => { setConfirmada(resultado); alGuardar?.(resultado); router.refresh() }}
   />}
   {existente && <p className="text-xs text-muted-foreground">La imagen actual se conserva hasta que la nueva quede guardada.</p>}
   {confirmada?.limpiezaPendiente && <p role="note" className="text-sm">La imagen nueva está guardada. Quedó pendiente limpiar el recurso anterior; requiere conciliación operativa.</p>}
   {sesionVencida && <Link href="/admin/login" className="text-sm underline">Iniciar sesión</Link>}
   {recargaRequerida && <Button type="button" variant="outline" onClick={() => { if (alRecargar) alRecargar(); else router.refresh() }}>{alRecargar ? "Recargar datos actuales" : "Recargar listado"}</Button>}
  </div>
 </PanelAdmin>
}
