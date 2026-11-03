"use client"
import { useState } from "react"
import Link from "next/link"
import { Search } from "lucide-react"
import type { FilaStock } from "@/lib/modulos/inventario/administracion-contrato"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { EncabezadoAdmin, PanelAdmin, EtiquetaEstado } from "./piezas-admin"
import { AvisoProductoGuardado } from "./aviso-producto-guardado"
import { DialogoAjusteStock } from "./dialogo-ajuste-stock"
import { DialogoMinimoStock } from "./dialogo-minimo-stock"
import { DialogoHistorialStock } from "./dialogo-historial-stock"

type Filtro = "" | "bajo" | "sin_stock"

export function StockAdmin({ filas, errorCarga = false }: { filas: FilaStock[]; errorCarga?: boolean }) {
  const [busqueda, buscar] = useState("")
  const [filtro, filtrar] = useState<Filtro>("")
  const [aviso, notificar] = useState<{ texto: string; numero: number } | null>(null)
  const visibles = filas.filter(f =>
    f.nombre.toLocaleLowerCase().includes(busqueda.toLocaleLowerCase())
    && (filtro === "" || (filtro === "bajo" ? f.stockBajo : f.sinStock)))
  const avisar = (texto: string) => notificar(prev => ({ texto, numero: (prev?.numero ?? 0) + 1 }))
  return <>
    <EncabezadoAdmin titulo="Inventario" simple />
    {aviso && <AvisoProductoGuardado key={aviso.numero} texto={aviso.texto} />}
    {errorCarga ? <PanelAdmin className="space-y-3 p-5"><p role="alert">No pudimos consultar el inventario.</p><Link href="/admin/stock" className="underline">Reintentar consulta</Link></PanelAdmin>
      : filas.length === 0 ? <PanelAdmin className="flex min-h-56 flex-col items-center justify-center gap-3 p-6 text-center"><h2 className="font-serif text-2xl">Todavía no hay productos con inventario</h2><p className="text-sm text-muted-foreground">El saldo se crea junto con cada producto nuevo.</p></PanelAdmin>
      : <>
        <div role="search" aria-label="Filtrar inventario" className="grid gap-3 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-2"><Label htmlFor="stock-busqueda">Buscar por nombre</Label><div className="relative"><Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-muted-foreground" /><Input id="stock-busqueda" className="h-11 pl-10" placeholder="Ej: Pulsera" value={busqueda} onChange={e => buscar(e.target.value)} /></div></div>
          <div className="min-w-0 space-y-2"><Label htmlFor="stock-estado">Estado</Label><select id="stock-estado" className="h-11 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary" value={filtro} onChange={e => filtrar(e.target.value as Filtro)}><option value="">Todos</option><option value="bajo">Stock bajo</option><option value="sin_stock">Sin stock</option></select></div>
        </div>
        <p role="status" className="text-xs text-muted-foreground">{visibles.length} {visibles.length === 1 ? "producto" : "productos"}</p>
        {visibles.length === 0 && <p>No hay productos que coincidan con estos filtros.</p>}
        <ul aria-label="Inventario por producto" className="space-y-3">{visibles.map(f => <li key={f.productoId}><PanelAdmin className="grid min-w-0 gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0 space-y-2">
            <h2 className="break-words font-medium leading-snug">{f.nombre}</h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
              <span className="text-muted-foreground">{f.categoriaNombre}</span>
              <span>Stock: <strong className="tabular-nums">{f.saldo}</strong></span>
              <span>Mínimo: <strong className="tabular-nums">{f.minimo ?? "Sin mínimo"}</strong></span>
              {f.sinStock && <EtiquetaEstado tono="alerta">Sin stock</EtiquetaEstado>}
              {f.stockBajo && !f.sinStock && <EtiquetaEstado tono="alerta">Stock bajo</EtiquetaEstado>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <DialogoAjusteStock fila={f} alGuardar={avisar} />
            <DialogoMinimoStock fila={f} alGuardar={avisar} />
            <DialogoHistorialStock fila={f} />
          </div>
        </PanelAdmin></li>)}</ul>
      </>}
  </>
}
