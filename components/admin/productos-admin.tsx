"use client"
import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import type { ConsultaAdministrativa } from "@/lib/modulos/productos/administracion-contrato"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EncabezadoAdmin, PanelAdmin, EtiquetaEstado } from "./piezas-admin"
import { AccionesProducto } from "./acciones-producto"
export function ProductosAdmin({ consulta, errorCarga = false, aviso }: { consulta: ConsultaAdministrativa; errorCarga?: boolean; aviso?: string }) {
 const [busqueda, buscar] = useState(""); const [categoria, filtrarCategoria] = useState(""); const [estado, filtrarEstado] = useState("")
 const productos = consulta.productos.filter(p => p.nombre.toLocaleLowerCase().includes(busqueda.toLocaleLowerCase()) && (!categoria || p.categoriaCodigo === categoria) && (!estado || (estado === "publicado") === p.publicado))
 return <>
  <EncabezadoAdmin titulo="Productos" descripcion="Tus productos, imágenes y visibilidad en el sitio."><Button asChild><Link href="/admin/productos/nuevo">Nuevo producto</Link></Button></EncabezadoAdmin>
  {aviso && <p role="status" className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">{aviso}</p>}
  {errorCarga ? <PanelAdmin className="space-y-3 p-5"><p role="alert">No pudimos consultar los productos. Probá recargar la página.</p><Link href="/admin/productos" className="underline">Reintentar consulta</Link></PanelAdmin> : consulta.productos.length === 0 ? <PanelAdmin className="space-y-3 p-6"><h2>Todavía no hay productos registrados.</h2><p className="text-sm text-muted-foreground">Creá el primero; podés conservarlo oculto hasta tener su imagen lista.</p><Link href="/admin/productos/nuevo" className="text-primary underline">Nuevo producto</Link></PanelAdmin> : <>
  <div className="grid gap-3 sm:grid-cols-3">
   <label className="text-sm">Buscar por nombre<Input value={busqueda} onChange={e=>buscar(e.target.value)} /></label>
   <label className="text-sm">Categoría<select className="mt-1 h-11 w-full rounded-md border bg-background px-3" value={categoria} onChange={e=>filtrarCategoria(e.target.value)}><option value="">Todas las categorías</option>{consulta.categorias.map(c=><option key={c.codigo} value={c.codigo}>{c.nombre}</option>)}</select></label>
   <label className="text-sm">Estado<select className="mt-1 h-11 w-full rounded-md border bg-background px-3" value={estado} onChange={e=>filtrarEstado(e.target.value)}><option value="">Todos los estados</option><option value="publicado">Publicado</option><option value="oculto">Oculto</option></select></label>
  </div>
  <p role="status" className="text-sm">{productos.length} productos</p>
  {productos.length === 0 && <p>No hay productos que coincidan con estos filtros.</p>}
  <ul aria-label="Productos registrados" className="space-y-3">{productos.map(p=><li key={p.id}><PanelAdmin className="grid min-w-0 grid-cols-[4rem_1fr_auto] items-start gap-3 p-4 sm:grid-cols-[5rem_1fr_auto]">
   {p.imagen ? <Image unoptimized src={p.imagen.urlSegura} width={80} height={80} alt={p.nombre} className="aspect-square w-full rounded-lg object-cover" /> : <span className="flex aspect-square items-center justify-center rounded-lg bg-card text-center text-xs">Sin imagen</span>}
   <div className="min-w-0 space-y-1"><h2 className="break-words font-medium">{p.nombre}</h2><p className="text-sm text-muted-foreground">{p.categoriaNombre}</p><p className="break-all text-sm">ARS $ {p.precio}</p><div className="flex flex-wrap gap-2"><EtiquetaEstado>{p.publicado ? "Publicado" : "Oculto"}</EtiquetaEstado>{p.destacado && <EtiquetaEstado tono="oliva">Destacado</EtiquetaEstado>}</div></div>
   <AccionesProducto producto={p} />
  </PanelAdmin></li>)}</ul></>}
 </>
}
