"use client"
import { useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { EstadoStock, estilosEstadoStock } from "./estado-stock"
import { Search } from "lucide-react"
import type { FilaStock } from "@/lib/modulos/inventario/administracion-contrato"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { EncabezadoAdmin, PanelAdmin } from "./piezas-admin"
import { AvisoProductoGuardado } from "./aviso-producto-guardado"
import { DialogoAjusteStock } from "./dialogo-ajuste-stock"
import { AccionesSecundariasStock } from "./acciones-secundarias-stock"
import { ResumenAlertasStock } from "./resumen-alertas-stock"
import { coincideFiltroStock, estadoVisualStock, filtroStock, ordenarAtencionStock, resumenStock, type FiltroStock } from "@/lib/presentacion/inventario"

export function StockAdmin({ filas, errorCarga = false, filtroInicial = "" }: { filas: FilaStock[]; errorCarga?: boolean; filtroInicial?: FiltroStock }) {
  const [busqueda, buscar] = useState("")
  const [filtro, filtrar] = useState<FiltroStock>(filtroInicial)
  const [aviso, notificar] = useState<{ texto: string; numero: number } | null>(null)
  const resumen = resumenStock(filas)
  const visibles = ordenarAtencionStock(filas.filter(f =>
    f.nombre.toLocaleLowerCase().includes(busqueda.trim().toLocaleLowerCase())
    && coincideFiltroStock(f, filtro)))
  const avisar = (texto: string) => notificar(prev => ({ texto, numero: (prev?.numero ?? 0) + 1 }))
  return <>
    <EncabezadoAdmin titulo="Inventario" simple />
    {!errorCarga && <ResumenAlertasStock filas={filas} filtro={filtro} alFiltrar={valor=>{filtrar(valor);buscar("")}} />}
    {!errorCarga && resumen.total>0 && resumen.sinStock===0 && resumen.pocas===0 && <p className="rounded-xl bg-primary/5 p-3 text-sm text-primary">Todo el inventario está al día</p>}
    {aviso && <AvisoProductoGuardado key={aviso.numero} texto={aviso.texto} />}
    {errorCarga ? <PanelAdmin className="space-y-3 p-5"><p role="alert">No pudimos consultar el inventario.</p><Link href="/admin/stock" className="underline">Reintentar consulta</Link></PanelAdmin>
      : filas.length === 0 ? <PanelAdmin className="flex min-h-56 flex-col items-center justify-center gap-3 p-6 text-center"><h2 className="font-serif text-2xl">Todavía no hay productos con inventario</h2><p className="text-sm text-muted-foreground">El saldo se crea junto con cada producto nuevo.</p></PanelAdmin>
      : <>
        <div role="search" aria-label="Filtrar inventario" className="grid gap-3 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-2"><Label htmlFor="stock-busqueda">Buscar por nombre</Label><div className="relative"><Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-muted-foreground" /><Input id="stock-busqueda" className="h-11 pl-10" placeholder="Ej: Pulsera" value={busqueda} onChange={e => buscar(e.target.value)} /></div></div>
          <div className="min-w-0 space-y-2"><Label htmlFor="stock-estado">Estado</Label><select id="stock-estado" className="h-11 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary" value={filtro} onChange={e => filtrar(filtroStock(e.target.value))}><option value="">Todos</option><option value="pocas">Pocas unidades</option><option value="sin_stock">Sin stock</option><option value="disponible">Stock disponible</option></select></div>
        </div>
        <p role="status" className="text-xs text-muted-foreground">{visibles.length} {visibles.length === 1 ? "producto" : "productos"}</p>
        {visibles.length === 0 ? <PanelAdmin className="space-y-3 p-6 text-center"><p>No hay productos que coincidan con estos filtros.</p><Button variant="outline" className="min-h-11" onClick={() => { buscar(""); filtrar("") }}>Limpiar filtros</Button></PanelAdmin> : <PanelAdmin className="border-0 bg-transparent max-md:shadow-none! md:border md:bg-background">
          <Table role="table" aria-label="Inventario por producto" className="block table-fixed md:table">
            <TableHeader role="rowgroup" className="sr-only md:not-sr-only md:table-header-group"><TableRow role="row" className="bg-card/40 hover:bg-card/40">
              <TableHead scope="col" className="w-[30%] px-4 text-xs text-muted-foreground">Producto</TableHead>
              <TableHead scope="col" className="w-[17%] px-4 text-xs text-muted-foreground">Existencias</TableHead>
              <TableHead scope="col" className="w-[20%] px-4 text-xs text-muted-foreground">Estado</TableHead>
              <TableHead scope="col" className="w-[33%] px-4 text-right text-xs text-muted-foreground">Acciones</TableHead>
            </TableRow></TableHeader>
            <TableBody role="rowgroup" className="grid gap-3 [&_tr:last-child]:border md:table-row-group md:[&_tr:last-child]:border-0">{visibles.map(f => <TableRow role="row" key={f.productoId} className={cn("grid min-w-0 grid-cols-2 items-center rounded-2xl border border-border/60 bg-background shadow-sm motion-reduce:transition-none md:table-row md:rounded-none md:border-x-0 md:border-t-0 md:shadow-none", estilosEstadoStock[estadoVisualStock(f.saldo)].fila)}>
              <TableCell role="cell" className="col-span-2 min-w-0 whitespace-normal px-4 py-3"><h2 className="font-medium leading-snug [overflow-wrap:anywhere]">{f.nombre}</h2><p className="mt-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">{f.categoriaNombre}</p></TableCell>
              <TableCell role="cell" className="min-w-0 whitespace-normal px-4 py-3 [overflow-wrap:anywhere]"><p><strong className={cn("text-2xl font-semibold tabular-nums", estilosEstadoStock[estadoVisualStock(f.saldo)].texto)}>{f.saldo}</strong><span className="ml-1.5 text-xs text-muted-foreground">unidades</span></p></TableCell>
              <TableCell role="cell" className="min-w-0 whitespace-normal px-4 py-3 [&>span]:max-w-full [&>span]:whitespace-normal"><EstadoStock estado={estadoVisualStock(f.saldo)} /></TableCell>
              <TableCell role="cell" className="col-span-2 whitespace-normal border-t border-border/50 px-4 py-3 md:border-0"><div className="flex flex-wrap items-center justify-end gap-2">
                <DialogoAjusteStock fila={f} alGuardar={avisar} />
                <AccionesSecundariasStock fila={f} />
              </div></TableCell>
            </TableRow>)}</TableBody>
          </Table>
        </PanelAdmin>}
      </>}
  </>
}
