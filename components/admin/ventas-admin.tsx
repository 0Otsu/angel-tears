"use client"
import { useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { ProductoParaVender } from "@/lib/modulos/ventas/administracion-contrato"
import type { ResumenVenta } from "@/lib/modulos/ventas/contrato"
import { nombreDeComprador } from "@/lib/modulos/ventas/reglas-venta"
import { formatearPrecioPublico } from "@/lib/modulos/catalogo/presentacion"
import { etiquetaEstadoVenta, formatearFechaOperacion } from "@/lib/presentacion/ventas"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AvisoProductoGuardado } from "./aviso-producto-guardado"
import { DialogoDetalleVenta } from "./dialogo-detalle-venta"
import { DialogoRegistroVenta } from "./dialogo-registro-venta"
import { EncabezadoAdmin, EtiquetaEstado, PanelAdmin } from "./piezas-admin"

export type FiltrosVentas = { estado: string; desde: string; hasta: string }

export function VentasAdmin({ ventas, hayMas, productos, filtros, erroresFiltro = {}, errorCarga = false }: {
  ventas: ResumenVenta[]
  hayMas: boolean
  productos: ProductoParaVender[]
  filtros: FiltrosVentas
  erroresFiltro?: Partial<Record<"estado" | "desde" | "hasta" | "limite", string>>
  errorCarga?: boolean
}) {
  const [aviso, notificar] = useState<{ texto: string; numero: number } | null>(null)
  const avisar = (texto: string) => notificar((prev) => ({ texto, numero: (prev?.numero ?? 0) + 1 }))
  const filtrado = Boolean(filtros.estado || filtros.desde || filtros.hasta)
  const hayErrores = Object.keys(erroresFiltro).length > 0

  return <>
    <EncabezadoAdmin titulo="Ventas" simple>{!errorCarga && <DialogoRegistroVenta productos={productos} alGuardar={avisar} />}</EncabezadoAdmin>
    {aviso && <AvisoProductoGuardado key={aviso.numero} texto={aviso.texto} />}
    {errorCarga ? <PanelAdmin className="space-y-3 p-5"><p role="alert">No pudimos consultar las ventas.</p><Link href="/admin/ventas" className="underline">Reintentar consulta</Link></PanelAdmin> : <>
      <form method="get" action="/admin/ventas" role="search" aria-label="Filtrar ventas" className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-start">
        <div className="min-w-0 space-y-2"><Label htmlFor="ventas-estado">Estado</Label>
          <select id="ventas-estado" name="estado" defaultValue={filtros.estado} aria-invalid={Boolean(erroresFiltro.estado)} aria-describedby={erroresFiltro.estado ? "error-ventas-estado" : undefined} className="h-11 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary"><option value="">Todas</option><option value="CONFIRMADA">Confirmadas</option><option value="ANULADA">Anuladas</option></select>
          {erroresFiltro.estado && <p id="error-ventas-estado" className="text-sm text-destructive">{erroresFiltro.estado}</p>}</div>
        <div className="min-w-0 space-y-2"><Label htmlFor="ventas-desde">Desde</Label>
          <Input id="ventas-desde" name="desde" type="date" defaultValue={filtros.desde} aria-invalid={Boolean(erroresFiltro.desde)} aria-describedby={erroresFiltro.desde ? "error-ventas-desde" : undefined} className="min-h-11" />
          {erroresFiltro.desde && <p id="error-ventas-desde" className="text-sm text-destructive">{erroresFiltro.desde}</p>}</div>
        <div className="min-w-0 space-y-2"><Label htmlFor="ventas-hasta">Hasta</Label>
          <Input id="ventas-hasta" name="hasta" type="date" defaultValue={filtros.hasta} aria-invalid={Boolean(erroresFiltro.hasta)} aria-describedby={erroresFiltro.hasta ? "error-ventas-hasta" : undefined} className="min-h-11" />
          {erroresFiltro.hasta && <p id="error-ventas-hasta" className="text-sm text-destructive">{erroresFiltro.hasta}</p>}</div>
        <div className="flex flex-wrap items-center gap-3 md:pt-7"><Button type="submit" className="min-h-11">Filtrar</Button>{filtrado && <Link href="/admin/ventas" className="inline-flex min-h-11 items-center px-2 text-sm underline">Limpiar filtros</Link>}</div>
      </form>

      {hayErrores ? <PanelAdmin className="p-5"><p role="alert" className="text-sm text-destructive">Revisá los filtros para ver las ventas.</p></PanelAdmin>
        : ventas.length === 0 ? <PanelAdmin className="flex min-h-56 flex-col items-center justify-center gap-3 p-6 text-center">
            <h2 className="font-serif text-2xl">{filtrado ? "No hay ventas con estos filtros" : "Todavía no registraste ventas"}</h2>
            <p className="text-sm text-muted-foreground">{filtrado ? "Probá con otro rango de fechas o con otro estado." : "Cuando registres una venta va a aparecer acá."}</p>
            {filtrado && <Link href="/admin/ventas" className="inline-flex min-h-11 items-center text-sm underline">Limpiar filtros</Link>}
          </PanelAdmin>
        : <>
          <p role="status" className="text-xs text-muted-foreground">{ventas.length} {ventas.length === 1 ? "venta" : "ventas"}{hayMas && " · hay más: acotá las fechas para verlas"}</p>
          <PanelAdmin className="border-0 bg-transparent max-md:shadow-none! md:border md:bg-background">
            <Table role="table" aria-label="Ventas" className="block table-fixed md:table">
              <TableHeader role="rowgroup" className="sr-only md:not-sr-only md:table-header-group"><TableRow role="row" className="bg-card/40 hover:bg-card/40">
                <TableHead scope="col" className="w-[14%] px-4 text-xs text-muted-foreground">Fecha</TableHead>
                <TableHead scope="col" className="w-[26%] px-4 text-xs text-muted-foreground">Comprador</TableHead>
                <TableHead scope="col" className="w-[10%] px-4 text-xs text-muted-foreground">Productos</TableHead>
                <TableHead scope="col" className="w-[16%] px-4 text-right text-xs text-muted-foreground">Total</TableHead>
                <TableHead scope="col" className="w-[14%] px-4 text-xs text-muted-foreground">Estado</TableHead>
                <TableHead scope="col" className="w-[20%] px-4 text-right text-xs text-muted-foreground">Acciones</TableHead>
              </TableRow></TableHeader>
              <TableBody role="rowgroup" className="grid gap-3 [&_tr:last-child]:border md:table-row-group md:[&_tr:last-child]:border-0">{ventas.map((v) => <TableRow role="row" key={v.id} className={cn("grid min-w-0 grid-cols-2 items-center rounded-2xl border border-border/60 bg-background shadow-sm md:table-row md:rounded-none md:border-x-0 md:border-t-0 md:shadow-none", v.estado === "ANULADA" && "text-muted-foreground")}>
                <TableCell role="cell" className="min-w-0 whitespace-normal px-4 py-3 tabular-nums"><span className="sr-only md:hidden">Fecha: </span>{formatearFechaOperacion(v.fechaOperacion)}</TableCell>
                <TableCell role="cell" className="min-w-0 whitespace-normal px-4 py-3 [overflow-wrap:anywhere]"><span className="sr-only md:hidden">Comprador: </span>{nombreDeComprador(v.comprador)}</TableCell>
                <TableCell role="cell" className="min-w-0 whitespace-normal px-4 py-3 tabular-nums"><span className="sr-only md:hidden">Productos: </span>{v.cantidadLineas}</TableCell>
                <TableCell role="cell" className={cn("min-w-0 whitespace-normal px-4 py-3 font-medium tabular-nums md:text-right", v.estado === "ANULADA" && "line-through")}><span className="sr-only md:hidden">Total: </span>{formatearPrecioPublico(v.total)}</TableCell>
                <TableCell role="cell" className="min-w-0 whitespace-normal px-4 py-3 [&>span]:max-w-full [&>span]:whitespace-normal"><EtiquetaEstado tono={v.estado === "CONFIRMADA" ? "oliva" : "alerta"}>{etiquetaEstadoVenta(v.estado)}</EtiquetaEstado></TableCell>
                <TableCell role="cell" className="col-span-2 whitespace-normal border-t border-border/50 px-4 py-3 md:border-0"><div className="flex flex-wrap items-center justify-end gap-2"><DialogoDetalleVenta resumen={v} alAnular={avisar} /></div></TableCell>
              </TableRow>)}</TableBody>
            </Table>
          </PanelAdmin>
        </>}
    </>}
  </>
}
