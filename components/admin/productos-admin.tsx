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
import { Button } from "@/components/ui/button"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell, TableCaption } from "@/components/ui/table"
import { EncabezadoAdmin, PanelAdmin, EtiquetaEstado } from "./piezas-admin"
import { AccionesProducto } from "./acciones-producto"
import { AvisoProductoGuardado } from "./aviso-producto-guardado"

export function ProductosAdmin({ consulta, disponibilidad = {}, errorCarga = false, aviso }: { consulta: ConsultaAdministrativa; disponibilidad?: Record<string, boolean>; errorCarga?: boolean; aviso?: string }) {
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
      {productos.length === 0 ? <PanelAdmin className="space-y-3 p-6 text-center"><p>No hay productos que coincidan con estos filtros.</p><Button variant="outline" className="min-h-11" onClick={() => { buscar(""); filtrarCategoria(""); filtrarEstado("") }}>Limpiar filtros</Button></PanelAdmin> : <PanelAdmin className="border-0 bg-transparent max-md:shadow-none! md:border md:bg-background">
        {/* Un solo arbol de controles: filas de tabla en escritorio y tarjetas apiladas en movil. */}
        <Table role="table" aria-label="Productos registrados" className="block table-fixed md:table">
          <TableCaption className="sr-only">Productos registrados. Publicación y disponibilidad de stock se muestran por separado.</TableCaption>
          <TableHeader role="rowgroup" className="sr-only md:not-sr-only md:table-header-group"><TableRow role="row" className="bg-card/40 hover:bg-card/40">
            <TableHead scope="col" className="w-[32%] px-4 text-xs text-muted-foreground">Producto</TableHead>
            <TableHead scope="col" className="w-[14%] px-4 text-xs text-muted-foreground">Categoría</TableHead>
            <TableHead scope="col" className="w-[14%] px-4 text-xs text-muted-foreground">Precio</TableHead>
            <TableHead scope="col" className="w-[20%] px-4 text-xs text-muted-foreground">Estado</TableHead>
            <TableHead scope="col" className="w-[20%] px-4 text-right text-xs text-muted-foreground">Acciones</TableHead>
          </TableRow></TableHeader>
          <TableBody role="rowgroup" className="grid gap-3 [&_tr:last-child]:border md:table-row-group md:[&_tr:last-child]:border-0">{productos.map(p => <TableRow role="row" key={p.id} className="grid min-w-0 grid-cols-2 items-center rounded-2xl border border-border/60 bg-background shadow-sm hover:bg-card/20 motion-reduce:transition-none md:table-row md:rounded-none md:border-x-0 md:border-t-0 md:shadow-none">
            <TableCell role="cell" className="col-span-2 min-w-0 whitespace-normal px-4 pb-1 pt-4 md:py-3"><div className="flex min-w-0 items-center gap-3">
              {p.imagen ? <Image src={p.imagen.urlSegura} sizes="48px" width={48} height={48} alt="" className="size-12 shrink-0 rounded-lg object-cover" /> : <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-card text-center text-[10px] text-muted-foreground">Sin imagen</span>}
              <h2 className="min-w-0 font-medium leading-snug [overflow-wrap:anywhere]">{p.nombre}</h2>
            </div></TableCell>
            <TableCell role="cell" className="col-span-2 whitespace-normal pb-2 pl-[4.75rem] pr-4 pt-0 text-xs text-muted-foreground md:p-4 md:text-sm">{p.categoriaNombre}</TableCell>
            <TableCell role="cell" className="min-w-0 whitespace-normal px-4 py-2 font-medium tabular-nums [overflow-wrap:anywhere] md:py-3"><span className="sr-only md:hidden">Precio: </span>{formatearPrecio(p.precio)}</TableCell>
            <TableCell role="cell" className="min-w-0 whitespace-normal px-4 py-2 md:py-3"><div className="flex flex-wrap gap-1.5"><EtiquetaEstado tono={p.publicado ? "oliva" : "neutro"}>{p.publicado ? "Publicado" : "Oculto"}</EtiquetaEstado>{p.destacado && <EtiquetaEstado tono="oliva">Destacado</EtiquetaEstado>}</div><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{!p.publicado ? "Fuera del catálogo" : disponibilidad[p.id] === false ? "Sin stock · fuera del listado" : disponibilidad[p.id] === true ? "Con stock" : "Stock sin confirmar"}</p></TableCell>
            <TableCell role="cell" className="col-span-2 min-w-0 whitespace-normal border-t border-border/50 p-3 md:border-0 md:px-4 md:py-3"><div className="flex flex-wrap items-center justify-end gap-2">
              <NavigationButton href={`/admin/productos/${p.id}/editar`} variant="outline" className="min-h-11 px-3" aria-label={`Editar ${p.nombre}`}>Editar</NavigationButton>
              <AccionesProducto producto={p} editarVisible alGuardar={siguiente => guardar(prev => ({ ...prev, [siguiente.id]: siguiente }))} alNotificar={texto => notificar(prev => ({ texto, numero: (prev?.numero ?? 0) + 1 }))} />
            </div></TableCell>
          </TableRow>)}</TableBody>
        </Table>
      </PanelAdmin>}
    </>}
  </>
}
