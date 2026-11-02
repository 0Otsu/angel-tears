"use client"
import { useState } from "react"
import { Check } from "lucide-react"
import { ImagenProducto as Image } from "@/components/ui/imagen-producto"
import { useRouter } from "next/navigation"
import type { ConsultaAdministrativa, ProductoAdministrativo } from "@/lib/modulos/productos/administracion-contrato"
import { formatearPrecioPublico as formatearPrecio } from "@/lib/modulos/catalogo/presentacion"
import { Button } from "@/components/ui/button"
import { EncabezadoAdmin, PanelAdmin, EtiquetaEstado } from "./piezas-admin"
import { FormularioProducto } from "./formulario-producto"
import { GaleriaProducto } from "./galeria-producto"
import { AccionesProducto } from "./acciones-producto"
import { CancelarProducto } from "./cancelar-producto"

type Paso = "datos" | "imagen" | "resumen"
function PasosProducto({ paso, elegir, ocupado = false, persistido = false, imagen = false, borrador = false }: { paso: Paso; elegir?: (paso: Paso) => void; ocupado?: boolean; persistido?: boolean; imagen?: boolean; borrador?: boolean }) {
  return <nav aria-label="Secciones del producto" className="flex flex-wrap gap-2">{(["datos", "imagen", "resumen"] as const).map((p, i) => {
    const completo = p === "datos" ? persistido && !borrador : p === "imagen" && imagen
    return <Button key={p} className="min-h-11 gap-2" disabled={ocupado || (!persistido && p !== "datos")} variant={paso === p ? "default" : "outline"} aria-current={paso === p ? "step" : undefined} aria-description={completo ? "Guardado" : undefined} onClick={() => elegir?.(p)}>{completo && paso !== p && <Check className="size-3.5" aria-hidden="true" />}{i + 1}. {p === "datos" ? "Datos" : p === "imagen" ? "Imagen" : "Finalizar"}</Button>
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
export function EditorProducto({ producto, categorias, pasoInicial = "datos", alta = false }: { producto: ProductoAdministrativo; categorias: ConsultaAdministrativa["categorias"]; pasoInicial?: "datos" | "imagen"; alta?: boolean }) {
  // Solo confirmaciones propias actualizan el snapshot. Una edicion ajena exige recarga.
  const [actual, setActual] = useState(producto)
  const [paso, setPaso] = useState<Paso>(pasoInicial)
  const [imagenOcupada, setImagenOcupada] = useState(false)
  const [datosOcupados, setDatosOcupados] = useState(false)
  const [borradorDatos, setBorradorDatos] = useState(false)
  const [borradorImagen, setBorradorImagen] = useState(false)
  const cambios = borradorDatos || borradorImagen
  const cancelar = (pendiente = false) => <CancelarProducto productoId={actual.id} hayCambios={cambios} ocupado={imagenOcupada || datosOcupados || pendiente} />
  return <>
    <EncabezadoAdmin titulo={alta ? "Completar producto" : "Editar producto"} descripcion={actual.nombre} simple />
    <PasosProducto paso={paso} elegir={setPaso} ocupado={imagenOcupada || datosOcupados} persistido imagen={actual.tieneImagen} borrador={borradorDatos} />
    <div hidden={paso !== "datos"}>
      <FormularioProducto producto={producto} versionPropia={actual.version} alCambiarOcupado={setDatosOcupados} alCambiarBorrador={setBorradorDatos} accionCancelar={cancelar()} categorias={categorias} cancelar={() => setPaso("resumen")} alGuardar={(_id, datos) => setActual(prev => ({ ...prev, ...datos, categoriaCodigo: categorias.find(c => c.codigo === datos.categoriaCodigo)?.codigo ?? prev.categoriaCodigo, categoriaNombre: categorias.find(c => c.codigo === datos.categoriaCodigo)?.nombre ?? prev.categoriaNombre, version: prev.version + 1 }))} />
    </div>
    <div hidden={paso !== "imagen"}>
      <GaleriaProducto productoId={actual.id} nombre={actual.nombre} version={actual.version} alCambiarOcupado={setImagenOcupada} alCambiarPendiente={setBorradorImagen} alGuardar={r => setActual(prev => ({ ...prev, version: r.version, tieneImagen: Boolean(r.imagen), imagen: r.imagen }))} />
      <div className="mt-4 flex flex-wrap gap-3">{cancelar()}<Button className="min-h-11" disabled={imagenOcupada} onClick={() => setPaso("resumen")}>Continuar al resumen</Button></div>
    </div>
    {paso === "resumen" && <PanelAdmin className="space-y-5 p-5 lg:p-6">
      <h2 className="text-base font-medium">Finalizar</h2>
      <div className="flex min-w-0 items-start gap-4">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-card sm:size-24">{actual.imagen ? <Image src={actual.imagen.urlSegura} fill sizes="96px" alt={`Imagen de ${actual.nombre}`} className="object-contain" /> : <span className="flex h-full items-center justify-center text-xs text-muted-foreground">Sin imagen</span>}</div>
        <div className="min-w-0 space-y-2"><h3 className="break-words font-serif text-xl leading-tight sm:text-2xl">{actual.nombre}</h3><p className="text-sm text-muted-foreground">{actual.categoriaNombre}</p><p className="font-medium tabular-nums">{formatearPrecio(actual.precio)}</p><div className="flex flex-wrap gap-2"><EtiquetaEstado>{actual.publicado ? "Publicado" : "Oculto"}</EtiquetaEstado>{actual.destacado && <EtiquetaEstado tono="oliva">Destacado</EtiquetaEstado>}</div></div>
      </div>
      {cambios && <div role="note" className="space-y-2 border-l-2 border-primary/40 pl-3 text-sm"><p>Tenés cambios sin guardar.</p><Button variant="outline" className="min-h-11" onClick={() => setPaso(borradorDatos ? "datos" : "imagen")}>{borradorDatos ? "Volver a Datos" : "Volver a Imágenes"}</Button></div>}
      <AccionesProducto producto={actual} alGuardar={setActual} disabled={cambios || imagenOcupada || datosOcupados} finalizar={!actual.publicado} accionCancelar={cancelar} alEditar={() => setPaso("datos")} alImagen={() => setPaso("imagen")} />
    </PanelAdmin>}
  </>
}
