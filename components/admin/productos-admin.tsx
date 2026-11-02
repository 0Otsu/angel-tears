"use client"
import { useState } from "react"
import Link from "next/link"
import { Plus, Search } from "lucide-react"
import { ImagenProducto as Image } from "@/components/ui/imagen-producto"
import type { ConsultaAdministrativa, ProductoAdministrativo } from "@/lib/modulos/productos/administracion-contrato"
import { formatearPrecioPublico as formatearPrecio } from "@/lib/modulos/catalogo/presentacion"
import { NavigationButton } from "@/components/ui/navigation-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { EncabezadoAdmin, PanelAdmin, EtiquetaEstado } from "./piezas-admin"
import { AccionesProducto } from "./acciones-producto"
import { AvisoProductoGuardado } from "./aviso-producto-guardado"

export function ProductosAdmin({ consulta, errorCarga = false, aviso }: { consulta: ConsultaAdministrativa; errorCarga?: boolean; aviso?: string }) {
  const [busqueda, buscar] = useState("")
  const [categoria, filtrarCategoria] = useState("")
  const [estado, filtrarEstado] = useState("")
  const [confirmados, guardar] = useState<Record<string, ProductoAdministrativo>>({})
  const [avisoAccion, notificar] = useState<{ texto: string; numero: number } | null>(null)
  const actuales = consulta.productos.map(p => confirmados[p.id]?.version >= p.version ? confirmados[p.id] : p)
  const productos = actuales.filter(p => p.nombre.toLocaleLowerCase().includes(busqueda.toLocaleLowerCase()) && (!categoria || p.categoriaCodigo === categoria) && (!estado || (estado === "publicado") === p.publicado))
  return <>
    <EncabezadoAdmin titulo="Productos" simple>{consulta.productos.length > 0 && <NavigationButton href="/admin/productos/nuevo" className="h-12 gap-2 px-5 text-sm"><Plus aria-hidden="true" className="size-5" />Nuevo producto</NavigationButton>}</EncabezadoAdmin>
    {(avisoAccion || aviso) && <AvisoProductoGuardado key={avisoAccion?.numero ?? aviso} texto={avisoAccion?.texto ?? aviso!} />}
    {errorCarga ? <PanelAdmin className="space-y-3 p-5"><p role="alert">No pudimos consultar los productos.</p><Link href="/admin/productos" className="underline">Reintentar consulta</Link></PanelAdmin> : actuales.length === 0 ? <PanelAdmin className="flex min-h-56 flex-col items-center justify-center gap-5 p-6 text-center"><h2 className="font-serif text-2xl">Todavía no hay productos</h2><NavigationButton href="/admin/productos/nuevo" className="h-12 gap-2 px-5"><Plus aria-hidden="true" />Crear primer producto</NavigationButton></PanelAdmin> : <>
      <div role="search" aria-label="Filtrar productos" className="grid gap-3 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-2"><Label htmlFor="productos-busqueda">Buscar por nombre</Label><div className="relative"><Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-muted-foreground" /><Input id="productos-busqueda" className="h-11 pl-10" placeholder="Ej: Pulsera" value={busqueda} onChange={e => buscar(e.target.value)} /></div></div>
        <div className="min-w-0 space-y-2"><Label htmlFor="productos-categoria">Categoría</Label><select id="productos-categoria" className="h-11 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary" value={categoria} onChange={e => filtrarCategoria(e.target.value)}><option value="">Todas las categorías</option>{consulta.categorias.map(c => <option key={c.codigo} value={c.codigo}>{c.nombre}</option>)}</select></div>
        <div className="min-w-0 space-y-2"><Label htmlFor="productos-estado">Estado</Label><select id="productos-estado" className="h-11 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary" value={estado} onChange={e => filtrarEstado(e.target.value)}><option value="">Todos los estados</option><option value="publicado">Publicado</option><option value="oculto">Oculto</option></select></div>
      </div>
      <p role="status" className="text-xs text-muted-foreground">{productos.length} {productos.length === 1 ? "producto" : "productos"}</p>
      {productos.length === 0 && <p>No hay productos que coincidan con estos filtros.</p>}
      <ul aria-label="Productos registrados" className="space-y-3">{productos.map(p => <li key={p.id}><PanelAdmin className="grid min-w-0 grid-cols-[3.5rem_minmax(0,1fr)_auto] items-start gap-3 p-4 sm:grid-cols-[4rem_minmax(0,1fr)_auto] sm:items-center">
        {p.imagen ? <Image src={p.imagen.urlSegura} sizes="64px" width={64} height={64} alt={p.nombre} className="aspect-square w-full rounded-lg object-cover" /> : <span className="flex aspect-square items-center justify-center rounded-lg bg-card text-center text-[10px] text-muted-foreground">Sin imagen</span>}
        <div className="min-w-0 space-y-2"><h2 className="break-words font-medium leading-snug">{p.nombre}</h2><div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm"><span className="font-medium tabular-nums">{formatearPrecio(p.precio)}</span><span className="text-muted-foreground">{p.categoriaNombre}</span><EtiquetaEstado>{p.publicado ? "Publicado" : "Oculto"}</EtiquetaEstado>{p.destacado && <EtiquetaEstado tono="oliva">Destacado</EtiquetaEstado>}</div></div>
        <AccionesProducto producto={p} alGuardar={siguiente => guardar(prev => ({ ...prev, [siguiente.id]: siguiente }))} alNotificar={texto => notificar(prev => ({ texto, numero: (prev?.numero ?? 0) + 1 }))} />
      </PanelAdmin></li>)}</ul>
    </>}
  </>
}
