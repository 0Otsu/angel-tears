"use client"
import { useEffect,useState,useSyncExternalStore } from 'react'
import { Bar,BarChart,CartesianGrid,XAxis,YAxis } from 'recharts'
import { ChevronLeft,ChevronRight } from 'lucide-react'
import { ChartContainer,ChartTooltip,type ChartConfig } from '@/components/ui/chart'
import type { PuntoEvolucion,PeriodoFinanzas } from '@/lib/modulos/finanzas/contrato'
import { agruparIntervalos,type IntervaloFinanciero,type AgrupacionVisual } from '@/lib/modulos/finanzas/intervalos'
import { resolverPeriodo } from '@/lib/modulos/finanzas/periodo'
import { importeFinanzas,fechaFinanzas } from '@/lib/presentacion/finanzas'
import { Button } from '@/components/ui/button'
import { CargandoAdmin } from './cargando-admin'
const config={ventas:{label:'Ingresos',color:'var(--chart-1)'},salidas:{label:'Salidas',color:'var(--chart-2)'}} satisfies ChartConfig
const suscribir=()=>()=>{},cliente=()=>true,servidor=()=>false
const fechas=(p:IntervaloFinanciero)=>p.fecha===p.hasta?fechaFinanzas(p.fecha):`${fechaFinanzas(p.fecha)} al ${fechaFinanzas(p.hasta)}`
function CapturarDetalle({active,payload,elegir}:{active?:boolean;payload?:readonly {payload?:IntervaloFinanciero}[];elegir:(fecha:string)=>void}){
 const fecha=payload?.[0]?.payload?.fecha
 useEffect(()=>{if(active&&fecha)elegir(fecha)},[active,fecha,elegir])
 return null
}
function EtiquetaEje({x=0,y=0,payload,semanal=false,diario=false}:{x?:number;y?:number;payload?:{value:string};semanal?:boolean;diario?:boolean}){
 const texto=payload?.value??'',dia=diario?texto.match(/^(.+?)\s*(\d+)$/):null,partes=semanal?texto.split(' '):dia?[dia[1],dia[2]]:[texto]
 return <g transform={`translate(${x},${y})`}><text textAnchor="middle" fill="var(--muted-foreground)" fontSize={10}><tspan x={0} dy={14}>{partes[0]}</tspan>{partes[1]&&<tspan x={0} dy={13}>{partes.slice(1).join(' ')}</tspan>}</text></g>
}
export function EvolucionFinanzas({puntos,agrupacion,periodo,dashboard=false}:{puntos:PuntoEvolucion[];agrupacion:'dia'|'mes';periodo?:PeriodoFinanzas;dashboard?:boolean}){
 const montado=useSyncExternalStore(suscribir,cliente,servidor)
 const [vista,setVista]=useState<AgrupacionVisual>(periodo?.modo==='semana'?'dia':'semana'),[ventana,setVentana]=useState(0),[seleccionado,elegir]=useState<string|null>(null)
 const fallback=resolverPeriodo({}),p=periodo??(fallback.estado==='ok'?fallback.periodo:null)
 if(!p)return null
 const grupo:AgrupacionVisual=agrupacion==='mes'?'mes':dashboard?vista:p.modo==='semana'?'dia':p.modo==='anio'?'mes':'semana'
 const intervalos=agruparIntervalos(puntos,p,grupo),porVentanas=grupo==='dia'&&intervalos.length>7
 const pagina=Math.min(ventana,Math.max(0,Math.ceil(intervalos.length/7)-1)),visibles=porVentanas?intervalos.slice(pagina*7,pagina*7+7):intervalos
 // Number solo posiciona barras; el total de salidas y el resultado ya son exactos.
 const datos=visibles.map(f=>({...f,ventasGrafico:Number(f.ventas),salidasGrafico:Number(f.salidas)}))
 const detalle=visibles.find(f=>f.fecha===seleccionado)??visibles.find(f=>!f.sinMovimientos)??visibles[0]
 return <div className="space-y-4">
 {dashboard&&agrupacion!=='mes'&&<div role="group" aria-label="Visualización del gráfico" className="inline-flex rounded-full bg-card p-1">{(['dia','semana'] as const).map(v=><Button key={v} variant={vista===v?'default':'ghost'} aria-pressed={vista===v} onClick={()=>{setVista(v);setVentana(0);elegir(null)}} className="min-h-11 rounded-full text-xs">{v==='dia'?'Por día':'Por semana'}</Button>)}</div>}
 {agrupacion==='mes'&&<p className="text-xs text-muted-foreground">Evolución por mes</p>}
 {!puntos.length?<p className="py-12 text-center text-sm text-muted-foreground">No hay operaciones vigentes en este período.</p>:<>
 {porVentanas&&<div className="flex items-center justify-between gap-2" aria-label="Ventana diaria"><Button variant="outline" size="icon" className="size-11 shrink-0" aria-label="7 días anteriores" disabled={pagina===0} onClick={()=>{setVentana(pagina-1);elegir(null)}}><ChevronLeft/></Button><p aria-live="polite" className="text-center text-xs text-muted-foreground">{fechaFinanzas(visibles[0].fecha)} – {fechaFinanzas(visibles.at(-1)!.hasta)}<span className="block">Días {pagina*7+1}–{pagina*7+visibles.length} de {intervalos.length}</span></p><Button variant="outline" size="icon" className="size-11 shrink-0" aria-label="7 días siguientes" disabled={(pagina+1)*7>=intervalos.length} onClick={()=>{setVentana(pagina+1);elegir(null)}}><ChevronRight/></Button></div>}
 <p className="sr-only">Usá las flechas izquierda y derecha sobre el gráfico para consultar los intervalos. El detalle aparece debajo. También podés consultar la tabla de datos.</p>
 {montado?<ChartContainer config={config} className="aspect-auto h-72 w-full min-w-0"><BarChart data={datos} onClick={estado=>{const i=Number(estado?.activeTooltipIndex);if(Number.isInteger(i)&&visibles[i])elegir(visibles[i].fecha)}} accessibilityLayer aria-label="Comparación de ingresos y salidas" maxBarSize={36} barGap={4} barCategoryGap="22%" margin={{top:12,right:8,left:0,bottom:10}}>
 <CartesianGrid vertical={false} strokeDasharray="3 5" stroke="var(--border)"/><XAxis dataKey="etiqueta" interval={grupo==='mes'?'preserveStartEnd':0} minTickGap={5} height={grupo==='mes'?30:44} axisLine={false} tickLine={false} tick={<EtiquetaEje semanal={grupo==='semana'} diario={grupo==='dia'}/>}/><YAxis width={48} axisLine={false} tickLine={false} fontSize={10} tickFormatter={v=>'$ '+new Intl.NumberFormat('es-AR',{notation:'compact',maximumFractionDigits:1}).format(v)}/>
 <ChartTooltip content={<CapturarDetalle elegir={elegir}/>}/>
 <Bar dataKey="ventasGrafico" name="Ingresos" fill="var(--color-ventas)" radius={[3,3,0,0]} isAnimationActive={false}/><Bar dataKey="salidasGrafico" name="Salidas" fill="var(--color-salidas)" radius={[3,3,0,0]} isAnimationActive={false}/>
 </BarChart></ChartContainer>:<CargandoAdmin tipo="grafico" nombre="gráfico"/>}
 <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">{(['ventas','salidas'] as const).map(f=><span key={f} className="flex items-center gap-2"><span aria-hidden="true" className="size-2 rounded-full" style={{backgroundColor:config[f].color}}/>{config[f].label}{f==='ventas'?' · ventas':' · compras y gastos'}</span>)}</div>
 {detalle&&<section aria-label="Detalle del intervalo" aria-live="polite" className="rounded-xl border border-border/60 bg-card/30 p-3 text-xs"><h3 className="mb-3 font-medium">{fechas(detalle)}</h3>{detalle.sinMovimientos&&<p className="mb-2 text-muted-foreground">Sin operaciones registradas</p>}<dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">{([['Ventas',detalle.ventas],['Compras',detalle.compras],['Gastos',detalle.egresos],['Total de salidas',detalle.salidas],['Resultado',detalle.resultado]] as const).map(([nombre,valor])=><div key={nombre} className={`min-w-0 space-y-1 ${nombre==='Resultado'?'col-span-2 sm:col-span-1':''}`}><dt className={nombre==='Resultado'?'font-medium':'text-muted-foreground'}>{nombre}</dt><dd className={`tabular-nums [overflow-wrap:anywhere] ${nombre==='Resultado'?(valor.startsWith('-')?'font-medium text-destructive':'font-medium text-success'):''}`}>{importeFinanzas(valor)}</dd></div>)}</dl></section>}
 <details><summary className="inline-flex min-h-11 cursor-pointer items-center text-sm text-primary underline focus-visible:outline-2">Ver datos del gráfico</summary><div className="max-h-80 overflow-auto rounded-lg border"><table className="w-full text-left text-xs" aria-label="Datos de evolución financiera"><caption className="sr-only">Todos los intervalos del período; importes exactos en ARS. Intervalos vacíos no representan operaciones.</caption><thead><tr>{['Intervalo','Ventas','Compras','Gastos','Total de salidas','Resultado económico'].map(t=><th key={t} scope="col" className="p-2">{t}</th>)}</tr></thead><tbody>{intervalos.map(f=><tr key={f.fecha} className="border-t"><th scope="row" className="p-2 font-normal">{f.etiqueta}<span className="block text-muted-foreground">{fechas(f)}</span>{f.sinMovimientos&&<span className="block text-muted-foreground">Sin operaciones registradas</span>}</th>{[f.ventas,f.compras,f.egresos,f.salidas,f.resultado].map((v,i)=><td key={i} className="p-2 tabular-nums">{importeFinanzas(v)}</td>)}</tr>)}</tbody></table></div></details>
 </>}
 </div>
}
