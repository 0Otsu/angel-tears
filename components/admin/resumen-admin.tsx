"use client"

import { useState } from "react"
import Link from "next/link"
import { Receipt, ShoppingBag, Wallet, Boxes, ArrowUpRight, AlertTriangle } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { importeDemo, periodosDemo, stockBajoDemo, ventasDemo, type PeriodoDemo } from "@/lib/mock/admin"
import { AvisoDemo, EncabezadoAdmin, PanelAdmin, TarjetaIndicador, TituloPanel, EtiquetaEstado } from "./piezas-admin"
import { GraficoPeriodo } from "./graficos-admin"
import { SelectorPeriodo } from "./selector-periodo"
import { TablaDemo } from "./tabla-demo"
import { filasMovimientos } from "./filas-demo"

export function ResumenAdmin() {
  const [periodo, setPeriodo] = useState<PeriodoDemo>("octubre")
  const [serie, setSerie] = useState<"ventas" | "compras" | "egresos">("ventas")
  const muestra = periodosDemo[periodo]
  const totales = muestra.series.reduce((a, s) => ({ ventas: a.ventas + s.ventas, compras: a.compras + s.compras, egresos: a.egresos + s.egresos }), { ventas: 0, compras: 0, egresos: 0 })
  return <>
    <EncabezadoAdmin titulo="Resumen" descripcion="Una mirada simple a la actividad de tu negocio." ><SelectorPeriodo valor={periodo} alCambiar={setPeriodo} /></EncabezadoAdmin>
    <AvisoDemo />
    <div className="grid grid-cols-2 gap-3 lg:gap-4 xl:grid-cols-4">
      <TarjetaIndicador titulo="Ventas del período" valor={importeDemo(totales.ventas)} nota="Operaciones vigentes · mock" icono={Receipt} />
      <TarjetaIndicador titulo="Compras del período" valor={importeDemo(totales.compras)} nota="Operaciones vigentes · mock" icono={ShoppingBag} />
      <TarjetaIndicador titulo="Egresos del período" valor={importeDemo(totales.egresos)} nota="Solo egresos manuales · mock" icono={Wallet} />
      <TarjetaIndicador titulo="Productos con stock bajo" valor={String(stockBajoDemo.length)} nota="Foto de inventario mock · incluye sin stock" icono={Boxes} />
    </div>
    <div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
      <PanelAdmin><TituloPanel titulo="Actividad del período" detalle={`${muestra.rango} · importes ficticios`} accion={<EtiquetaEstado>Mock</EtiquetaEstado>} />
        <Tabs value={serie} onValueChange={valor => setSerie(valor as typeof serie)} className="gap-4 px-5 pb-5 lg:px-6 lg:pb-6"><TabsList className="h-9 rounded-full"><TabsTrigger value="ventas" className="rounded-full px-4 text-xs">Ventas</TabsTrigger><TabsTrigger value="compras" className="rounded-full px-4 text-xs">Compras</TabsTrigger><TabsTrigger value="egresos" className="rounded-full px-4 text-xs">Egresos</TabsTrigger></TabsList><GraficoPeriodo periodo={periodo} serie={serie} /></Tabs>
      </PanelAdmin>
      <PanelAdmin><TituloPanel titulo="Stock para revisar" detalle="Muestra de productos con mínimo definido" accion={<Tooltip><TooltipTrigger asChild><button className="rounded-full p-1 text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary" aria-label="Acerca del stock de muestra"><AlertTriangle className="size-4" /></button></TooltipTrigger><TooltipContent className="max-w-64">Estados mock predefinidos. El umbral de stock bajo requiere validación.</TooltipContent></Tooltip>} />
        <div className="space-y-1 px-5">{stockBajoDemo.map(p => <div key={p.id} className="flex items-center justify-between gap-3 border-b border-border/50 py-4 last:border-b-0"><div><p className="text-sm font-medium">{p.nombre}</p><p className="mt-1 text-xs text-muted-foreground">Stock {p.stock} · mínimo {p.minimo}</p></div><EtiquetaEstado tono="alerta">{p.estadoStock}</EtiquetaEstado></div>)}</div>
        <div className="mt-5 border-t border-border/60 px-5 py-4"><Link href="/admin/stock" className="inline-flex items-center gap-2 rounded-md text-xs font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-primary">Ver stock de muestra<ArrowUpRight className="size-3.5" aria-hidden="true" /></Link></div>
      </PanelAdmin>
    </div>
    <TablaDemo titulo="Ventas de muestra" descripcion="Historial fijo de octubre · independiente del selector del gráfico" columnas={["Referencia", "Fecha", "Detalle", "Importe", "Estado"]} filas={filasMovimientos(ventasDemo).slice(0, 4)} compacta accion={<Link href="/admin/ventas" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">Ver historial<ArrowUpRight className="size-3.5" /></Link>} />
  </>
}
