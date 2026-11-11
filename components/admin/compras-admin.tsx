"use client"
import { useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { ProductoParaComprar, ProveedorParaComprar } from "@/lib/modulos/compras/administracion-contrato"
import type { ResumenCompra } from "@/lib/modulos/compras/contrato"
import { formatearPrecioPublico } from "@/lib/modulos/catalogo/presentacion"
import { etiquetaEstadoCompra, formatearFechaCompra, SIN_PROVEEDOR } from "@/lib/presentacion/compras"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AvisoProductoGuardado } from "./aviso-producto-guardado"
import { DialogoDetalleCompra } from "./dialogo-detalle-compra"
import { DialogoRegistroCompra } from "./dialogo-registro-compra"
import { EncabezadoAdmin, EtiquetaEstado, PanelAdmin } from "./piezas-admin"

export type FiltrosCompras = { estado: string; desde: string; hasta: string }

export function ComprasAdmin({ compras, hayMas, productos, proveedores, filtros, erroresFiltro = {}, errorCarga = false }: {
  compras: ResumenCompra[]
  hayMas: boolean
  productos: ProductoParaComprar[]
  proveedores: ProveedorParaComprar[]
  filtros: FiltrosCompras
  erroresFiltro?: Partial<Record<"estado" | "desde" | "hasta" | "limite", string>>
  errorCarga?: boolean
}) {
  const [aviso, notificar] = useState<{ texto: string; numero: number } | null>(null)
  const avisar = (texto: string) => notificar((prev) => ({ texto, numero: (prev?.numero ?? 0) + 1 }))
  const filtrado = Boolean(filtros.estado || filtros.desde || filtros.hasta)
  const hayErrores = Object.keys(erroresFiltro).length > 0

  return <>
    <EncabezadoAdmin titulo="Compras" simple>{!errorCarga && <DialogoRegistroCompra productos={productos} proveedores={proveedores} alGuardar={avisar} />}</EncabezadoAdmin>
    {aviso && <AvisoProductoGuardado key={aviso.numero} texto={aviso.texto} />}
    {errorCarga ? <PanelAdmin className="space-y-3 p-5"><p role="alert">No pudimos consultar las compras.</p><Link href="/admin/compras" className="underline">Reintentar consulta</Link></PanelAdmin> : <>
      <form method="get" action="/admin/compras" role="search" aria-label="Filtrar compras" className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-start">
        <div className="min-w-0 space-y-2"><Label htmlFor="compras-estado">Estado</Label>
          <select id="compras-estado" name="estado" defaultValue={filtros.estado} aria-invalid={Boolean(erroresFiltro.estado)} aria-describedby={erroresFiltro.estado ? "error-compras-estado" : undefined} className="h-11 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary"><option value="">Todas</option><option value="CONFIRMADA">Confirmadas</option><option value="ANULADA">Anuladas</option></select>
          {erroresFiltro.estado && <p id="error-compras-estado" className="text-sm text-destructive">{erroresFiltro.estado}</p>}</div>
        <div className="min-w-0 space-y-2"><Label htmlFor="compras-desde">Desde</Label>
          <Input id="compras-desde" name="desde" type="date" defaultValue={filtros.desde} aria-invalid={Boolean(erroresFiltro.desde)} aria-describedby={erroresFiltro.desde ? "error-compras-desde" : undefined} className="min-h-11" />
          {erroresFiltro.desde && <p id="error-compras-desde" className="text-sm text-destructive">{erroresFiltro.desde}</p>}</div>
        <div className="min-w-0 space-y-2"><Label htmlFor="compras-hasta">Hasta</Label>
          <Input id="compras-hasta" name="hasta" type="date" defaultValue={filtros.hasta} aria-invalid={Boolean(erroresFiltro.hasta)} aria-describedby={erroresFiltro.hasta ? "error-compras-hasta" : undefined} className="min-h-11" />
          {erroresFiltro.hasta && <p id="error-compras-hasta" className="text-sm text-destructive">{erroresFiltro.hasta}</p>}</div>
        <div className="flex flex-wrap items-center gap-3 md:pt-7"><Button type="submit" className="min-h-11">Filtrar</Button>{filtrado && <Link href="/admin/compras" className="inline-flex min-h-11 items-center px-2 text-sm underline">Limpiar filtros</Link>}</div>
      </form>

      {hayErrores ? <PanelAdmin className="p-5"><p role="alert" className="text-sm text-destructive">Revisá los filtros para ver las compras.</p></PanelAdmin>
        : compras.length === 0 ? <PanelAdmin className="flex min-h-56 flex-col items-center justify-center gap-3 p-6 text-center">
            <h2 className="font-serif text-2xl">{filtrado ? "No hay compras con estos filtros" : "Todavía no registraste compras"}</h2>
            <p className="text-sm text-muted-foreground">{filtrado ? "Probá con otro rango de fechas o con otro estado." : "Cuando registres una compra va a aparecer acá y el stock va a aumentar."}</p>
            {filtrado && <Link href="/admin/compras" className="inline-flex min-h-11 items-center text-sm underline">Limpiar filtros</Link>}
          </PanelAdmin>
        : <>
          <p role="status" className="text-xs text-muted-foreground">{compras.length} {compras.length === 1 ? "compra" : "compras"}{hayMas && " · hay más: acotá las fechas para verlas"}</p>
          <PanelAdmin className="border-0 bg-transparent max-md:shadow-none! md:border md:bg-background">
            <Table role="table" aria-label="Compras" className="block table-fixed md:table">
              <TableHeader role="rowgroup" className="sr-only md:not-sr-only md:table-header-group"><TableRow role="row" className="bg-card/40 hover:bg-card/40">
                <TableHead scope="col" className="w-[14%] px-4 text-xs text-muted-foreground">Fecha</TableHead>
                <TableHead scope="col" className="w-[26%] px-4 text-xs text-muted-foreground">Proveedor</TableHead>
                <TableHead scope="col" className="w-[10%] px-4 text-xs text-muted-foreground">Productos</TableHead>
                <TableHead scope="col" className="w-[16%] px-4 text-right text-xs text-muted-foreground">Total</TableHead>
                <TableHead scope="col" className="w-[14%] px-4 text-xs text-muted-foreground">Estado</TableHead>
                <TableHead scope="col" className="w-[20%] px-4 text-right text-xs text-muted-foreground">Acciones</TableHead>
              </TableRow></TableHeader>
              <TableBody role="rowgroup" className="grid gap-3 [&_tr:last-child]:border md:table-row-group md:[&_tr:last-child]:border-0">{compras.map((c) => <TableRow role="row" key={c.id} className={cn("grid min-w-0 grid-cols-2 items-center rounded-2xl border border-border/60 bg-background shadow-sm md:table-row md:rounded-none md:border-x-0 md:border-t-0 md:shadow-none", c.estado === "ANULADA" && "text-muted-foreground")}>
                <TableCell role="cell" className="min-w-0 whitespace-normal px-4 py-3 tabular-nums"><span className="sr-only md:hidden">Fecha: </span>{formatearFechaCompra(c.fechaOperacion)}</TableCell>
                <TableCell role="cell" className="min-w-0 whitespace-normal px-4 py-3 [overflow-wrap:anywhere]"><span className="sr-only md:hidden">Proveedor: </span>{c.nombreProveedor ?? SIN_PROVEEDOR}</TableCell>
                <TableCell role="cell" className="min-w-0 whitespace-normal px-4 py-3 tabular-nums"><span className="sr-only md:hidden">Productos: </span>{c.cantidadLineas}</TableCell>
                <TableCell role="cell" className={cn("min-w-0 whitespace-normal px-4 py-3 font-medium tabular-nums md:text-right", c.estado === "ANULADA" && "line-through")}><span className="sr-only md:hidden">Total: </span>{formatearPrecioPublico(c.total)}</TableCell>
                <TableCell role="cell" className="min-w-0 whitespace-normal px-4 py-3 [&>span]:max-w-full [&>span]:whitespace-normal"><EtiquetaEstado tono={c.estado === "CONFIRMADA" ? "oliva" : "alerta"}>{etiquetaEstadoCompra(c.estado)}</EtiquetaEstado></TableCell>
                <TableCell role="cell" className="col-span-2 whitespace-normal border-t border-border/50 px-4 py-3 md:border-0"><div className="flex flex-wrap items-center justify-end gap-2"><DialogoDetalleCompra resumen={c} alAnular={avisar} /></div></TableCell>
              </TableRow>)}</TableBody>
            </Table>
          </PanelAdmin>
        </>}
    </>}
  </>
}
