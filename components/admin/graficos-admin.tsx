"use client"

import { useSyncExternalStore } from "react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Pie, PieChart, Cell, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { importeDemo, periodosDemo, segmentosDemo, type PeriodoDemo } from "@/lib/mock/admin"

const configuracion = {
  ventas: { label: "Ventas", color: "var(--primary)" },
  compras: { label: "Compras", color: "var(--muted-foreground)" },
  egresos: { label: "Egresos manuales", color: "var(--accent)" },
} satisfies ChartConfig

const suscribirMontaje = () => () => {}
const graficoEnCliente = () => true
const graficoEnServidor = () => false

function useGraficoMontado() {
  return useSyncExternalStore(suscribirMontaje, graficoEnCliente, graficoEnServidor)
}

export function GraficoPeriodo({ periodo, serie = "ventas", barras = false }: { periodo: PeriodoDemo; serie?: "ventas" | "compras" | "egresos"; barras?: boolean }) {
  const montado = useGraficoMontado()
  if (!montado) return <div className="h-60 animate-pulse rounded-xl bg-card/40" role="status" aria-label="Cargando gráfico de muestra" />
  const datos = periodosDemo[periodo].series
  // Recharts 2 identifica sus ejes como hijos directos; un Fragment los oculta.
  const ejes = [
    <CartesianGrid key="grilla" vertical={false} strokeDasharray="3 5" stroke="var(--border)" />,
    <XAxis key="horizontal" dataKey="semana" axisLine={false} tickLine={false} tickMargin={12} fontSize={11} />,
    <YAxis key="vertical" axisLine={false} tickLine={false} width={43} tickFormatter={v => `${Number(v) / 1000} mil`} fontSize={10} />,
    <ChartTooltip key="detalle" content={<ChartTooltipContent labelFormatter={valor => `Días ${valor}`} formatter={(valor, nombre) => <div className="flex min-w-36 justify-between gap-5"><span className="text-muted-foreground">{configuracion[nombre as keyof typeof configuracion]?.label ?? nombre}</span><span className="font-medium tabular-nums">{importeDemo(Number(valor))}</span></div>} />} />,
  ]
  return <div role="img" aria-label={`Gráfico mock de ${barras ? "ventas, compras y egresos" : serie} en ${periodosDemo[periodo].nombre}`}>
    <ChartContainer config={configuracion} className="aspect-auto h-60 w-full min-w-0">
      {barras ? <BarChart accessibilityLayer data={datos} margin={{ top: 12, right: 8, left: 0, bottom: 6 }}>
        {ejes}
        <Bar dataKey="ventas" fill="var(--color-ventas)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
        <Bar dataKey="compras" fill="var(--color-compras)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
        <Bar dataKey="egresos" fill="var(--color-egresos)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
      </BarChart> : <AreaChart accessibilityLayer data={datos} margin={{ top: 12, right: 8, left: 0, bottom: 6 }}>
        {ejes}
        <Area type="linear" dataKey={serie} stroke={`var(--color-${serie})`} fill={`var(--color-${serie})`} fillOpacity={0.12} strokeWidth={2.5} isAnimationActive={false} />
      </AreaChart>}
    </ChartContainer>
    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-muted-foreground">
      {(barras ? ["ventas", "compras", "egresos"] as const : [serie]).map(clave => <span key={clave} className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ backgroundColor: configuracion[clave].color }} />{configuracion[clave].label}</span>)}
    </div>
  </div>
}

export function GraficoCircularCandidato() {
  const montado = useGraficoMontado()
  // CANDIDATO VISUAL - REQUIERE VALIDACIÓN. Sin métrica o regla de negocio asignada.
  const segmentos = segmentosDemo
  return <div className="grid items-center gap-6 sm:grid-cols-2">
    <div className="relative h-60 min-w-0" role="img" aria-label="Patrón circular de demostración, sin significado de negocio">
      {montado && <ChartContainer config={{ valor: { label: "Muestra", color: "var(--primary)" } }} className="aspect-auto h-60 w-full"><PieChart><Pie data={segmentos} dataKey="valor" nameKey="nombre" innerRadius="62%" outerRadius="85%" paddingAngle={5} stroke="none" isAnimationActive={false}>{segmentos.map(item => <Cell key={item.nombre} fill={item.color} />)}</Pie></PieChart></ChartContainer>}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="font-serif text-2xl">Demo</span><span className="text-[10px] text-muted-foreground">Sin indicador asignado</span></div>
    </div>
    <div><p className="text-sm font-medium">Patrón de gráfico circular</p><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Se conserva la composición del template para evaluar su utilidad. No representa inventario, ventas ni un requisito del producto.</p><div className="mt-5 space-y-3">{segmentos.map(item => <div key={item.nombre} className="flex items-center gap-2 text-xs text-muted-foreground"><span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />{item.nombre}<span className="ml-auto tabular-nums">{item.valor} · valor ficticio</span></div>)}</div></div>
  </div>
}
