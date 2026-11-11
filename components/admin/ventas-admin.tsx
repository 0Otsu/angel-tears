"use client"
import { FiltrosOperacionesAdmin } from "./filtros-operaciones"
import { PaginacionOperaciones } from "./paginacion-operaciones"
import type { Paginacion } from "@/lib/paginacion"
import type { FiltrosOperaciones, ErroresOperaciones } from "@/lib/presentacion/operaciones"
import { useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { ProductoParaVender } from "@/lib/modulos/ventas/administracion-contrato"
import type { ResumenVenta } from "@/lib/modulos/ventas/contrato"
import { nombreDeComprador } from "@/lib/modulos/ventas/reglas-venta"
import { formatearPrecioPublico } from "@/lib/modulos/catalogo/presentacion"
import { etiquetaEstadoVenta, formatearFechaOperacion } from "@/lib/presentacion/ventas"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AvisoProductoGuardado } from "./aviso-producto-guardado"
import { DialogoDetalleVenta } from "./dialogo-detalle-venta"
import { DialogoRegistroVenta } from "./dialogo-registro-venta"
import { EncabezadoAdmin, EtiquetaEstado, PanelAdmin } from "./piezas-admin"

export type FiltrosVentas = FiltrosOperaciones

export function VentasAdmin({ ventas, hayMas, paginacion, productos, filtros, erroresFiltro = {}, errorCarga = false }: {
  ventas: ResumenVenta[]
  paginacion?: Paginacion
  hayMas: boolean
  productos: ProductoParaVender[]
  filtros: FiltrosVentas
  erroresFiltro?: ErroresOperaciones
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
      <FiltrosOperacionesAdmin ruta="/admin/ventas" filtros={filtros} errores={erroresFiltro} femenino />

      {hayErrores ? <PanelAdmin className="p-5"><p role="alert" className="text-sm text-destructive">Revisá los filtros para ver las ventas.</p></PanelAdmin>
        : ventas.length === 0 ? <PanelAdmin className="flex min-h-56 flex-col items-center justify-center gap-3 p-6 text-center">
            <h2 className="font-serif text-2xl">{filtrado ? "No hay ventas con estos filtros" : "Todavía no registraste ventas"}</h2>
            <p className="text-sm text-muted-foreground">{filtrado ? "Probá con otro rango de fechas o con otro estado." : "Cuando registres una venta va a aparecer acá."}</p>
            {filtrado && <Link href="/admin/ventas" className="inline-flex min-h-11 items-center text-sm underline">Limpiar filtros</Link>}
          </PanelAdmin>
        : <>
          <p role="status" className="text-xs text-muted-foreground">{ventas.length} {ventas.length === 1 ? "venta" : "ventas"}{hayMas && !paginacion && " · hay más: acotá las fechas para verlas"}</p>
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
    {!errorCarga && !Object.keys(erroresFiltro).length && paginacion && <PaginacionOperaciones ruta="/admin/ventas" filtros={filtros} datos={paginacion} />}
  </>
}
