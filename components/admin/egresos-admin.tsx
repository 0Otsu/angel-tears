"use client"
import { useState } from "react"
import Link from "next/link"
import type { EgresoDetalle, ErroresFiltro } from "@/lib/modulos/egresos/contrato"
import { formatearPrecioPublico } from "@/lib/modulos/catalogo/presentacion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AvisoProductoGuardado } from "./aviso-producto-guardado"
import { EncabezadoAdmin, PanelAdmin, EtiquetaEstado } from "./piezas-admin"
import { DialogoRegistroEgreso } from "./dialogo-registro-egreso"
import { DialogoDetalleEgreso } from "./dialogo-detalle-egreso"

export function EgresosAdmin({ egresos, filtros, hayMas = false, erroresFiltro = {}, errorCarga = false }: {
  egresos: EgresoDetalle[]; filtros: { desde: string; hasta: string; estado: string }; hayMas?: boolean; erroresFiltro?: ErroresFiltro; errorCarga?: boolean
}) {
  const [aviso, notificar] = useState<{ texto: string; numero: number } | null>(null)
  const avisar = (texto: string) => notificar(prev => ({ texto, numero: (prev?.numero ?? 0) + 1 }))
  return <>
    <EncabezadoAdmin titulo="Egresos manuales" simple>{!errorCarga && <DialogoRegistroEgreso alGuardar={avisar} />}</EncabezadoAdmin>
    {aviso && <AvisoProductoGuardado key={aviso.numero} texto={aviso.texto} />}
    {errorCarga ? <PanelAdmin className="space-y-3 p-5"><p role="alert">No pudimos consultar los egresos.</p><Link className="underline" href="/admin/egresos">Reintentar consulta</Link></PanelAdmin> : <>
      <form method="get" action="/admin/egresos" role="search" aria-label="Filtrar egresos" className="grid gap-3 md:grid-cols-4 md:items-start">
        <div className="space-y-2"><Label htmlFor="egresos-estado">Estado</Label><select id="egresos-estado" name="estado" defaultValue={filtros.estado} aria-invalid={!!erroresFiltro.estado} aria-describedby={erroresFiltro.estado ? "error-filtro-estado" : undefined} className="h-11 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary"><option value="">Todos</option><option value="CONFIRMADO">Confirmados</option><option value="ANULADO">Anulados</option></select>{erroresFiltro.estado && <p id="error-filtro-estado" className="text-sm text-destructive">{erroresFiltro.estado}</p>}</div>
        {(["desde", "hasta"] as const).map(c => <div className="space-y-2" key={c}><Label htmlFor={`egresos-${c}`}>{c === "desde" ? "Desde" : "Hasta"}</Label><Input id={`egresos-${c}`} type="date" name={c} defaultValue={filtros[c]} aria-invalid={!!erroresFiltro[c]} aria-describedby={erroresFiltro[c] ? `error-filtro-${c}` : undefined} />{erroresFiltro[c] && <p id={`error-filtro-${c}`} className="text-sm text-destructive">{erroresFiltro[c]}</p>}</div>)}
        <div className="flex flex-wrap items-center gap-3 md:pt-7"><Button type="submit" className="min-h-11">Filtrar</Button><Link className="inline-flex min-h-11 items-center text-sm underline" href="/admin/egresos">Mes actual</Link></div>
      </form>
      {Object.keys(erroresFiltro).length ? <p role="alert" className="text-sm text-destructive">Revisá los filtros para consultar los egresos.</p> : !egresos.length ? <PanelAdmin className="p-6 text-center"><h2 className="font-serif text-2xl">No hay egresos en este período</h2><p className="mt-2 text-sm text-muted-foreground">Probá con otro período o registrá un egreso manual.</p></PanelAdmin> : <>
        <p role="status" className="text-xs text-muted-foreground">{egresos.length} {egresos.length === 1 ? "egreso" : "egresos"}{hayMas && " · hay más: acotá el período para verlos"}</p>
        <PanelAdmin className="border-0 bg-transparent max-md:shadow-none! md:border md:bg-background"><Table role="table" aria-label="Egresos manuales" className="block table-fixed md:table">
          <TableHeader role="rowgroup" className="sr-only md:not-sr-only md:table-header-group"><TableRow role="row">{["Fecha", "Concepto", "Importe", "Estado", "Acciones"].map(c => <TableHead key={c} scope="col">{c}</TableHead>)}</TableRow></TableHeader>
          <TableBody role="rowgroup" className="grid gap-3 [&_tr:last-child]:border md:table-row-group md:[&_tr:last-child]:border-0">{egresos.map(e => <TableRow role="row" key={e.id} className="grid min-w-0 grid-cols-2 items-center rounded-2xl border border-border/60 bg-background md:table-row md:rounded-none md:border-x-0 md:border-t-0">
            <TableCell role="cell" className="whitespace-normal px-4 py-3 tabular-nums">{e.fechaOperacion.split("-").reverse().join("/")}</TableCell>
            <TableCell role="cell" className="whitespace-normal px-4 py-3 font-medium [overflow-wrap:anywhere]">{e.concepto}</TableCell>
            <TableCell role="cell" className={`whitespace-normal px-4 py-3 tabular-nums ${e.estado === "ANULADO" ? "text-muted-foreground line-through" : "font-medium"}`}>{formatearPrecioPublico(e.importe)}</TableCell>
            <TableCell role="cell" className="px-4 py-3"><EtiquetaEstado tono={e.estado === "CONFIRMADO" ? "oliva" : "neutro"}>{e.estado === "CONFIRMADO" ? "Confirmado" : "Anulado"}</EtiquetaEstado></TableCell>
            <TableCell role="cell" className="col-span-2 px-4 py-3 md:text-right"><DialogoDetalleEgreso resumen={e} alAnular={avisar} /></TableCell>
          </TableRow>)}</TableBody>
        </Table></PanelAdmin>
      </>}
    </>}
  </>
}
