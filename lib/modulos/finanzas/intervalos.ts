import type { PeriodoFinanzas, PuntoEvolucion } from './contrato'
import { centavosADecimal, decimalACentavos } from '@/lib/modulos/compras/dinero'
import { resultadoEconomico } from './agregacion'
export type IntervaloFinanciero = PuntoEvolucion & {hasta:string; etiqueta:string; salidas:string; resultado:string; sinMovimientos:boolean}
export type AgrupacionVisual = 'dia'|'semana'|'mes'
const iso=(d:Date)=>d.toISOString().slice(0,10)
const dia=(s:string)=>new Date(s+'T12:00:00Z')
export function agruparIntervalos(puntos:PuntoEvolucion[],p:PeriodoFinanzas,grupo:AgrupacionVisual):IntervaloFinanciero[]{
 const intervalos:IntervaloFinanciero[]=[];let cursor=p.desde
 while(cursor<=p.hasta){const inicio=dia(cursor),fin=dia(cursor)
  if(grupo==='semana')fin.setUTCDate(fin.getUTCDate()+6-((fin.getUTCDay()+6)%7))
  if(grupo==='mes')fin.setUTCMonth(fin.getUTCMonth()+1,0)
  const hasta=iso(fin)<p.hasta?iso(fin):p.hasta
  const filas=puntos.filter(f=>f.fecha>=cursor&&f.fecha<=hasta)
  const sumar=(k:'ventas'|'compras'|'egresos')=>centavosADecimal(filas.reduce((s,f)=>s+decimalACentavos(f[k])!,BigInt(0)))
  const ventas=sumar('ventas'),compras=sumar('compras'),egresos=sumar('egresos')
  const mesCorto=(f:string)=>new Intl.DateTimeFormat('es-AR',{timeZone:'UTC',month:'short'}).format(dia(f))
  const etiqueta=grupo==='semana'?cursor===hasta?`${inicio.getUTCDate()} ${mesCorto(cursor)}`:`${inicio.getUTCDate()}–${dia(hasta).getUTCDate()} ${mesCorto(hasta)}`:new Intl.DateTimeFormat('es-AR',{timeZone:'UTC',...(grupo==='mes'?{month:'short'}:{weekday:'short',day:'numeric'})}).format(inicio)
  intervalos.push({fecha:cursor,hasta,etiqueta,ventas,compras,egresos,salidas:centavosADecimal(decimalACentavos(compras)!+decimalACentavos(egresos)!),resultado:resultadoEconomico(ventas,compras,egresos),sinMovimientos:filas.length===0})
  if(hasta===p.hasta)break
  fin.setTime(dia(hasta).getTime());fin.setUTCDate(fin.getUTCDate()+1);cursor=iso(fin)
 }
 return intervalos
}
export function desplazarPeriodo(p:PeriodoFinanzas,paso:number):string{
 const d=dia(p.desde)
 if(p.modo==='semana')d.setUTCDate(d.getUTCDate()+7*paso)
 else if(p.modo==='anio')d.setUTCFullYear(d.getUTCFullYear()+paso,0,1)
 else d.setUTCMonth(d.getUTCMonth()+paso,1)
 return iso(d)
}
export function tituloPeriodo(p:PeriodoFinanzas):string{
 if(p.modo==='anio')return p.desde.slice(0,4)
 if(p.modo==='semana')return `${new Intl.DateTimeFormat('es-AR',{timeZone:'UTC',day:'numeric',month:'long'}).format(dia(p.desde))} al ${new Intl.DateTimeFormat('es-AR',{timeZone:'UTC',day:'numeric',month:'long',year:'numeric'}).format(dia(p.hasta))}`
 return new Intl.DateTimeFormat('es-AR',{timeZone:'UTC',month:'long',year:'numeric'}).format(dia(p.desde))
}
