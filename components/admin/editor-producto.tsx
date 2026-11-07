"use client"
import { useState } from "react"
import { Check } from "lucide-react"
import { useRouter } from "next/navigation"
import type { ConsultaAdministrativa, ProductoAdministrativo } from "@/lib/modulos/productos/administracion-contrato"
import { Button } from "@/components/ui/button"
import { EncabezadoAdmin, PanelAdmin } from "./piezas-admin"
import { FormularioProducto } from "./formulario-producto"
import { GaleriaProducto } from "./galeria-producto"
import { AccionesProducto } from "./acciones-producto"
import { CancelarProducto } from "./cancelar-producto"
import { VistaPreviaProducto } from "./vista-previa-producto"

type Paso = "datos" | "imagen" | "vista-previa"
function PasosProducto({ paso, elegir, ocupado = false, persistido = false, imagen = false, borrador = false, imagenPendiente = false }: { paso: Paso; elegir?: (paso: Paso) => void; ocupado?: boolean; persistido?: boolean; imagen?: boolean; borrador?: boolean; imagenPendiente?: boolean }) {
  return <nav aria-label="Secciones del producto" className="flex flex-wrap gap-2">{(["datos", "imagen", "vista-previa"] as const).map((p, i) => {
    const completo = p === "datos" ? persistido && !borrador : p === "imagen" && imagen && !imagenPendiente
    return <Button key={p} className="min-h-11 gap-2" disabled={ocupado || (!persistido && p !== "datos") || p === "vista-previa" && imagenPendiente} variant={paso === p ? "default" : "outline"} aria-current={paso === p ? "step" : undefined} aria-description={completo ? "Guardado" : undefined} onClick={() => elegir?.(p)}>{completo && paso !== p && <Check className="size-3.5" aria-hidden="true" />}{i + 1}. {p === "datos" ? "Datos" : p === "imagen" ? "Imágenes" : "Vista previa"}</Button>
  })}</nav>
}
export function NuevoProducto({ categorias }: { categorias: ConsultaAdministrativa["categorias"] }) {
  const router = useRouter()
  const [cambios, setCambios] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  return <><EncabezadoAdmin titulo="Nuevo producto" simple /><PasosProducto paso="datos" ocupado={ocupado} />
    <FormularioProducto categorias={categorias} cancelar={() => router.push("/admin/productos")} alCambiarBorrador={setCambios} alCambiarOcupado={setOcupado} accionCancelar={<CancelarProducto hayCambios={cambios} ocupado={ocupado} />} alGuardar={id => router.push(`/admin/productos/${id}/editar?paso=imagen&alta=1`)} />
  </>
}
export function EditorProducto({ producto, categorias, pasoInicial = "datos", alta = false }: { producto: ProductoAdministrativo; categorias: ConsultaAdministrativa["categorias"]; pasoInicial?: Paso; alta?: boolean }) {
  // Solo confirmaciones propias actualizan el snapshot. Una edicion ajena exige recarga.
  const [actual, setActual] = useState(producto)
  const [paso, setPaso] = useState<Paso>(pasoInicial)
  const [imagenOcupada, setImagenOcupada] = useState(false)
  const [guardandoImagenes, setGuardandoImagenes] = useState(0)
  const [datosOcupados, setDatosOcupados] = useState(false)
  const [borradorDatos, setBorradorDatos] = useState(false)
  const [borradorImagen, setBorradorImagen] = useState(false)
  const cambios = borradorDatos || borradorImagen
  const cancelar = (pendiente = false) => <CancelarProducto productoId={actual.id} hayCambios={cambios} ocupado={imagenOcupada || datosOcupados || pendiente} />
  const acciones = (listo: boolean, disponible?: boolean) => <AccionesProducto producto={actual} disponible={disponible} alGuardar={setActual} disabled={!listo || cambios || imagenOcupada || datosOcupados} finalizar={!actual.publicado} enVistaPrevia accionCancelar={cancelar} alEditar={() => setPaso("datos")} alImagen={() => setPaso("imagen")} />
  return <>
    <EncabezadoAdmin titulo={alta ? "Completar producto" : "Editar producto"} descripcion={actual.nombre} simple />
    <PasosProducto paso={paso} elegir={setPaso} ocupado={imagenOcupada || datosOcupados} persistido imagen={actual.tieneImagen} borrador={borradorDatos} imagenPendiente={borradorImagen} />
    <div hidden={paso !== "datos"}>
      <FormularioProducto producto={producto} versionPropia={actual.version} alCambiarOcupado={setDatosOcupados} alCambiarBorrador={setBorradorDatos} accionCancelar={cancelar()} categorias={categorias} cancelar={() => setPaso("vista-previa")} alGuardar={(_id, datos) => setActual(prev => ({ ...prev, ...datos, categoriaCodigo: categorias.find(c => c.codigo === datos.categoriaCodigo)?.codigo ?? prev.categoriaCodigo, categoriaNombre: categorias.find(c => c.codigo === datos.categoriaCodigo)?.nombre ?? prev.categoriaNombre, version: prev.version + 1 }))} />
    </div>
    <div hidden={paso !== "imagen"}>
      <GaleriaProducto productoId={actual.id} nombre={actual.nombre} version={actual.version} alCambiarOcupado={setImagenOcupada} alCambiarPendiente={setBorradorImagen} alCambiarGuardando={setGuardandoImagenes} alGuardar={r => setActual(prev => ({ ...prev, version: r.version, tieneImagen: Boolean(r.imagen), imagen: r.imagen }))} />
      {guardandoImagenes > 0 && <p role="status" className="mt-3 text-sm">Guardando {guardandoImagenes} {guardandoImagenes === 1 ? "imagen" : "imágenes"}…</p>}
      {borradorImagen && !imagenOcupada && guardandoImagenes === 0 && <p role="note" className="mt-3 text-sm">Reintentá o quitá las imágenes con error para continuar.</p>}
      <div className="mt-4 flex flex-wrap gap-3">{cancelar()}<Button className="min-h-11" disabled={imagenOcupada || borradorImagen} onClick={() => setPaso("vista-previa")}>Continuar a vista previa</Button></div>
    </div>
    {paso === "vista-previa" && (cambios ? <PanelAdmin className="space-y-4 p-5"><div role="note" className="space-y-2 text-sm"><p>Tenés cambios sin guardar.</p><Button variant="outline" className="min-h-11" onClick={() => setPaso(borradorDatos ? "datos" : "imagen")}>{borradorDatos ? "Volver a Datos" : "Volver a Imágenes"}</Button></div>{acciones(false)}</PanelAdmin> : <VistaPreviaProducto productoId={actual.id} version={actual.version} publicado={actual.publicado} slug={actual.slug} editarDatos={() => setPaso("datos")} gestionarImagenes={() => setPaso("imagen")} acciones={acciones} />)}
  </>
}
