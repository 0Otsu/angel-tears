"use client"
import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import type { ConsultaAdministrativa, ProductoAdministrativo } from "@/lib/modulos/productos/administracion-contrato"
import { Button } from "@/components/ui/button"
import { EncabezadoAdmin, PanelAdmin } from "./piezas-admin"
import { FormularioProducto } from "./formulario-producto"
import { CargaImagenProducto } from "./carga-imagen-producto"
import { AccionesProducto } from "./acciones-producto"
import { CancelarProducto } from "./cancelar-producto"

export function NuevoProducto({ categorias }: { categorias: ConsultaAdministrativa["categorias"] }) {
  const router = useRouter()
  const [cambios, setCambios] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  return <><EncabezadoAdmin titulo="Nuevo producto" descripcion="Paso 1 de 3 · Completá los datos. Podés agregar la imagen y publicarlo después." />
    <FormularioProducto categorias={categorias} cancelar={() => router.push("/admin/productos")} alCambiarBorrador={setCambios} alCambiarOcupado={setOcupado} accionCancelar={<CancelarProducto hayCambios={cambios} ocupado={ocupado} />} alGuardar={id => router.push(`/admin/productos/${id}/editar?paso=imagen&alta=1`)} />
  </>
}

export function EditorProducto({ producto, categorias, pasoInicial = "datos", alta = false }: { producto: ProductoAdministrativo; categorias: ConsultaAdministrativa["categorias"]; pasoInicial?: "datos" | "imagen"; alta?: boolean }) {
  // Snapshot de la edicion abierta: solo las operaciones propias coordinan su version.
  // Cambios de otra pestaña requieren recarga explicita, para no sobreescribir con un borrador viejo.
  const [actual, setActual] = useState(producto)
  const [paso, setPaso] = useState<"datos" | "imagen" | "resumen">(pasoInicial)
  const [imagenOcupada, setImagenOcupada] = useState(false)
  const [datosOcupados, setDatosOcupados] = useState(false)
  const [borradorDatos, setBorradorDatos] = useState(false)
  const [borradorImagen, setBorradorImagen] = useState(false)
  const cancelar = (pendiente = false) => <CancelarProducto productoId={actual.id} hayCambios={borradorDatos || borradorImagen} ocupado={imagenOcupada || datosOcupados || pendiente} />
  return <>
    <EncabezadoAdmin titulo={alta ? "Completar producto" : "Editar producto"} descripcion={`${actual.nombre} · ${actual.publicado ? "Publicado" : "Oculto"}${actual.destacado ? " · Destacado" : ""}`} />
    <nav aria-label="Secciones del producto" className="flex flex-wrap gap-2">
      {(["datos", "imagen", "resumen"] as const).map((p, i) => <Button key={p} disabled={imagenOcupada || datosOcupados} variant={paso === p ? "default" : "outline"} aria-current={paso === p ? "step" : undefined} onClick={() => setPaso(p)}>{i + 1}. {p === "datos" ? "Datos" : p === "imagen" ? "Imagen" : "Finalizar"}</Button>)}
    </nav>
    <div hidden={paso !== "datos"}>
      {actual.imagen && <Image unoptimized src={actual.imagen.urlSegura} width={actual.imagen.ancho} height={actual.imagen.alto} alt={`Imagen vigente de ${actual.nombre}`} className="mb-4 max-h-40 w-auto max-w-full object-contain" />}
      <FormularioProducto producto={producto} versionPropia={actual.version} alCambiarOcupado={setDatosOcupados} alCambiarBorrador={setBorradorDatos} accionCancelar={cancelar()} categorias={categorias} cancelar={() => setPaso("resumen")} alGuardar={(_id, datos) => setActual(prev => ({ ...prev, ...datos, categoriaCodigo: prev.categoriaCodigo === datos.categoriaCodigo ? prev.categoriaCodigo : categorias.find(c => c.codigo === datos.categoriaCodigo)!.codigo, categoriaNombre: categorias.find(c => c.codigo === datos.categoriaCodigo)?.nombre ?? prev.categoriaNombre, version: prev.version + 1 }))} />
    </div>
    <div hidden={paso !== "imagen"}>
      <CargaImagenProducto productoId={actual.id} nombre={actual.nombre} version={actual.version} tieneImagen={actual.tieneImagen} imagenActual={actual.imagen} alRecargar={() => window.location.reload()} alCambiarOcupado={setImagenOcupada} alCambiarPendiente={setBorradorImagen} alGuardar={r => setActual(prev => ({ ...prev, version: r.version, tieneImagen: true, imagen: r.imagen }))} />
      <div className="mt-4 flex flex-wrap gap-3">{cancelar()}<Button disabled={imagenOcupada} onClick={() => setPaso("resumen")}>Continuar al resumen</Button></div>
    </div>
    {paso === "resumen" && <PanelAdmin className="space-y-4 p-5">
      <h2 className="text-lg font-medium">Resumen del producto</h2>
      {(borradorDatos || borradorImagen) && <p role="note" className="text-sm">Hay cambios locales sin guardar. Este resumen muestra los datos y la imagen ya guardados; podés volver a Datos o Imagen para confirmarlos.</p>}
      {actual.imagen && <Image unoptimized src={actual.imagen.urlSegura} width={actual.imagen.ancho} height={actual.imagen.alto} alt={`Imagen de ${actual.nombre}`} className="max-h-56 w-auto max-w-full object-contain" />}
      <p className="break-words font-medium">{actual.nombre}</p><p>{actual.categoriaNombre} · ARS $ {actual.precio}</p><p>{actual.publicado ? "Publicado" : "Oculto"}</p>
      <div className="flex flex-wrap gap-3"><AccionesProducto producto={actual} alGuardar={setActual} finalizar={!actual.publicado} accionCancelar={cancelar} alEditar={() => setPaso("datos")} alImagen={() => setPaso("imagen")} /></div>
    </PanelAdmin>}
  </>
}
