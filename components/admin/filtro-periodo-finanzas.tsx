"use client"
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ErroresPeriodo,FiltroFinanzas } from '@/lib/modulos/finanzas/contrato'
import { resolverPeriodo,fechaActualFinanzas } from '@/lib/modulos/finanzas/periodo'
import { desplazarPeriodo,tituloPeriodo } from '@/lib/modulos/finanzas/intervalos'

export function FiltroPeriodoFinanzas({filtro,errores={},destino='/admin'}:{filtro:FiltroFinanzas;errores?:ErroresPeriodo;destino?:string}){
 const router=useRouter(),[pendiente,iniciar]=useTransition(),r=resolverPeriodo(filtro),actual=resolverPeriodo({})
 const p=r.estado==='ok'?r.periodo:actual.estado==='ok'?actual.periodo:null
 if(!p)return null
 const hoy=fechaActualFinanzas(),ancla=hoy>=p.desde&&hoy<=p.hasta?hoy:p.desde
 const navegar=(parametros:Record<string,string>)=>iniciar(()=>router.push(`${destino}?${new URLSearchParams(parametros)}`,{scroll:false}))
 const cambiar=(modo:string,referencia:string)=>navegar({modo,referencia})
 const siguiente=desplazarPeriodo(p,1),anterior=desplazarPeriodo(p,-1)
 const esActual=hoy>=p.desde&&hoy<=p.hasta
 return <section aria-label="Elegir período" aria-busy={pendiente} className="min-w-0 space-y-2">
  <div className="flex flex-wrap items-center gap-2">
   <Button variant="outline" size="icon" className="size-11 shrink-0" aria-label="Período anterior" disabled={pendiente||p.modo==='rango'||anterior<'0001-01-01'} onClick={()=>cambiar(p.modo,anterior)}><ChevronLeft /></Button>
   <p aria-live="polite" className="min-w-0 max-w-64 flex-1 text-center text-sm font-medium capitalize">{p.modo==='rango'?`${p.desde.split('-').reverse().join('/')} al ${p.hasta.split('-').reverse().join('/')}`:tituloPeriodo(p)}</p>
   <Button variant="outline" size="icon" className="size-11 shrink-0" aria-label="Período siguiente" disabled={pendiente||p.modo==='rango'||p.desde>hoy||siguiente>hoy} onClick={()=>cambiar(p.modo,siguiente)}><ChevronRight /></Button>
   {!(esActual&&p.modo==='mes')&&<button disabled={pendiente} className="min-h-11 px-2 text-xs text-primary underline" onClick={()=>navegar({modo:'mes',mes:hoy.slice(0,7)})}>Mes actual</button>}
   {pendiente&&<span role="status" className="inline-flex items-center"><Spinner/><span className="sr-only">Actualizando período…</span></span>}
  </div>
  <details className="text-xs" open={Object.keys(errores).length>0||p.modo==='rango'?true:undefined}>
   <summary className="inline-flex min-h-11 cursor-pointer items-center text-primary underline focus-visible:outline-2">Otros períodos</summary>
   <div className="space-y-3 rounded-xl border border-border/60 bg-background p-3">
    <div className="space-y-2"><Label htmlFor="resumen-periodo">Período</Label><select id="resumen-periodo" value={p.modo} disabled={pendiente} className="h-11 w-full rounded-md border bg-background px-3 text-sm" onChange={e=>e.target.value==='rango'?navegar({modo:'rango',desde:p.desde,hasta:p.hasta}):cambiar(e.target.value,ancla)}><option value="mes">Mes</option><option value="semana">Semana</option><option value="anio">Año</option><option value="rango">Elegir fechas</option></select></div>
    {p.modo==='rango'&&<form key={`${p.desde}/${p.hasta}`} className="grid gap-3 sm:grid-cols-2" onSubmit={e=>{e.preventDefault();const datos=new FormData(e.currentTarget);navegar({modo:'rango',desde:String(datos.get('desde')),hasta:String(datos.get('hasta'))})}}>
     <div className="space-y-2"><Label htmlFor="resumen-desde">Desde</Label><Input id="resumen-desde" type="date" name="desde" defaultValue={p.desde} required/></div>
     <div className="space-y-2"><Label htmlFor="resumen-hasta">Hasta</Label><Input id="resumen-hasta" type="date" name="hasta" defaultValue={p.hasta} required/></div>
     <Button type="submit" variant="outline" disabled={pendiente} className="min-h-11 sm:col-span-2">Consultar fechas</Button>
    </form>}
   </div>
  </details>
  {Object.keys(errores).length>0&&<p role="alert" className="max-w-sm text-sm text-destructive">{Object.values(errores).join(' ')}</p>}
 </section>
}
