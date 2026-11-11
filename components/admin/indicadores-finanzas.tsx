import Link from 'next/link'
import { ArrowUpRight,ShoppingCart,Receipt,Wallet } from 'lucide-react'
import { FUENTES,type ResumenFinanzas } from '@/lib/modulos/finanzas/contrato'
import { parametrosPeriodo } from '@/lib/modulos/finanzas/periodo'
import { etiquetaPeriodo,importeFinanzas,nombresFuentes } from '@/lib/presentacion/finanzas'
import { PanelAdmin } from './piezas-admin'
const iconos={ventas:ArrowUpRight,compras:ShoppingCart,egresos:Receipt}
export function IndicadoresFinanzas({datos,resumen=false,detallado=false,mensual=false}:{datos:ResumenFinanzas;resumen?:boolean;detallado?:boolean;mensual?:boolean}){
 const resultado=<PanelAdmin className={`min-w-0 p-4 sm:p-5 ${detallado?(datos.resultado?.startsWith('-')?'border-destructive/20 bg-destructive/5':'border-primary/25 bg-primary/5'):''}`}><div className="flex items-center justify-between gap-2"><h3 className="text-xs font-medium text-muted-foreground">Resultado económico</h3><Wallet className="size-4 shrink-0 text-primary" aria-hidden="true"/></div><p className={`mt-3 font-medium tabular-nums [overflow-wrap:anywhere] ${detallado?'text-3xl sm:text-4xl':'text-base sm:text-xl xl:text-2xl'} ${datos.resultado?.startsWith('-')?'text-destructive':'text-primary'}`}>{datos.resultado===null?'No disponible':importeFinanzas(datos.resultado)}</p><p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{datos.resultado===null?'Falta información de una o más fuentes.':'Ventas − compras − gastos'}</p></PanelAdmin>
 return <section aria-label="Indicadores financieros" className="space-y-3">
 {resumen&&<div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-medium">Operaciones del período</h2><Link href={`/admin?${parametrosPeriodo(datos.periodo)}`} className="inline-flex min-h-11 items-center text-sm text-primary underline">Consultar período</Link><p className="w-full text-xs text-muted-foreground">{etiquetaPeriodo(datos.periodo)}</p></div>}
 {detallado&&resultado}
 <div className={`grid grid-cols-2 gap-3 ${detallado?'sm:grid-cols-3':'xl:grid-cols-4'}`}>
 {FUENTES.map(f=>{const fuente=datos.fuentes[f],Icono=iconos[f];return <PanelAdmin key={f} className={`min-w-0 p-3 sm:p-4 ${detallado&&f==='egresos'?'col-span-2 sm:col-span-1':''}`}><div className="flex items-start justify-between gap-2"><h3 className="text-xs font-medium leading-relaxed text-muted-foreground">{(resumen||mensual)?`${nombresFuentes[f]} del mes`:`${nombresFuentes[f]} vigentes`}</h3><span className="rounded-lg bg-primary/10 p-1.5 text-primary"><Icono className="size-3.5 shrink-0" aria-hidden="true"/></span></div>{fuente.estado==='ok'?<><p className="mt-3 text-base font-medium tabular-nums [overflow-wrap:anywhere] sm:text-xl xl:text-2xl">{importeFinanzas(fuente.resumen.vigentes.total)}</p><p className="mt-2 text-[11px] text-muted-foreground">{fuente.resumen.vigentes.cantidad} {fuente.resumen.vigentes.cantidad===1?'operación':'operaciones'}</p></>:<p role="alert" className="mt-3 text-sm text-destructive">No pudimos consultar {nombresFuentes[f].toLowerCase()}.</p>}</PanelAdmin>})}
 {!detallado&&resultado}
 </div>
 <p className="text-xs leading-relaxed text-muted-foreground">Resultado de gestión; no representa ganancia contable. Se excluyen las operaciones anuladas.</p>
 </section>
}
