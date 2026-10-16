"use client"

import { useState } from "react"
import { Info } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { importeDemo, periodosDemo, type PeriodoDemo } from "@/lib/mock/admin"
import { AvisoDemo, EncabezadoAdmin, PanelAdmin, TituloPanel } from "./piezas-admin"
import { SelectorPeriodo } from "./selector-periodo"
import { GraficoPeriodo, GraficoCircularCandidato } from "./graficos-admin"

export function ReportesAdmin() {
  const [periodo, setPeriodo] = useState<PeriodoDemo>("octubre")
  const muestra = periodosDemo[periodo]
  const ventas = muestra.series.reduce((s, d) => s + d.ventas, 0)
  const compras = muestra.series.reduce((s, d) => s + d.compras, 0)
  const egresos = muestra.series.reduce((s, d) => s + d.egresos, 0)
  return <><EncabezadoAdmin titulo="Reportes" descripcion="Visualizaciones de muestra sobre conceptos del alcance actual."><SelectorPeriodo valor={periodo} alCambiar={setPeriodo} /></EncabezadoAdmin><AvisoDemo />
    <Tabs defaultValue="economico" className="gap-5">
      <TabsList className="h-10 max-w-full rounded-full"><TabsTrigger value="economico" className="rounded-full px-4 text-xs">Resumen económico</TabsTrigger><TabsTrigger value="exploracion" className="rounded-full px-4 text-xs">Exploración visual</TabsTrigger></TabsList>
      <TabsContent value="economico" className="space-y-5">
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
          <PanelAdmin><TituloPanel titulo="Operaciones del período" detalle={`${muestra.rango} · datos mock`} /><div className="px-5 pb-6 lg:px-6"><GraficoPeriodo periodo={periodo} barras /></div></PanelAdmin>
          <PanelAdmin className="overflow-hidden"><TituloPanel titulo="Resultado económico aproximado" detalle={muestra.nombre + " · muestra"} /><div className="px-5 pb-6 lg:px-6"><p className="mb-6 font-serif text-4xl text-primary tabular-nums">{importeDemo(ventas - compras - egresos)}</p><dl className="space-y-3 text-xs"><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Ventas vigentes</dt><dd className="tabular-nums">{importeDemo(ventas)}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted-foreground">− Compras vigentes</dt><dd className="tabular-nums">{importeDemo(compras)}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted-foreground">− Egresos manuales vigentes</dt><dd className="tabular-nums">{importeDemo(egresos)}</dd></div></dl><p className="mt-6 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">No representa ganancia contable ni contabilidad profesional. Importes ficticios; sin operaciones anuladas ni doble conteo de compras.</p></div></PanelAdmin>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-border bg-card/30 p-4 text-xs leading-relaxed text-muted-foreground"><Info className="mt-0.5 size-4 shrink-0 text-primary" /><p>Los gráficos representan semanas de un período simulado. Su composición, moneda, rangos y filtros son propuestas visuales; no definen nuevos requisitos ni una consulta real.</p></div>
      </TabsContent>
      <TabsContent value="exploracion"><PanelAdmin><div className="border-b border-border/60 px-5 py-4"><p className="text-[10px] font-medium uppercase tracking-[0.1em] text-primary">CANDIDATO VISUAL - REQUIERE VALIDACIÓN</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Biblioteca de patrones. No forma parte de los reportes validados de Angel Tears.</p></div><div className="p-5 lg:p-8"><GraficoCircularCandidato /></div></PanelAdmin></TabsContent>
    </Tabs>
  </>
}
