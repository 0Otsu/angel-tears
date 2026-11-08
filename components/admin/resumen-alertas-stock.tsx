import Link from "next/link"
import { cn } from "@/lib/utils"
import { estilosEstadoStock } from "./estado-stock"
import type { FilaStock } from "@/lib/modulos/inventario/administracion-contrato"
import { resumenStock, enlaceFiltroStock, type FiltroStock } from "@/lib/presentacion/inventario"

export function ResumenAlertasStock({filas, filtro = "", alFiltrar}: {filas: FilaStock[]; filtro?: FiltroStock; alFiltrar?: (filtro: FiltroStock)=>void}) {
  const resumen = resumenStock(filas)
  const tarjetas = [{filtro:"" as const,titulo:"Total de productos",cantidad:resumen.total},{filtro:"sin_stock" as const,titulo:"Sin stock",cantidad:resumen.sinStock},{filtro:"pocas" as const,titulo:"Pocas unidades",cantidad:resumen.pocas}]
  return <div className="space-y-2"><div className="grid grid-cols-3 gap-2 sm:gap-3">{tarjetas.map(t=>{
    const contenido = <><span className="block text-xs sm:text-sm">{t.titulo}</span>{" "}<strong className="mt-1 block text-2xl tabular-nums sm:text-3xl">{t.cantidad}</strong></>
    const tono = t.filtro ? estilosEstadoStock[t.filtro] : null
    const clase = cn("block min-h-24 rounded-2xl border border-border bg-background p-3 text-left transition-colors hover:bg-primary/5 aria-pressed:ring-1 aria-pressed:ring-current focus-visible:outline-2 focus-visible:outline-primary motion-reduce:transition-none sm:p-4", tono && (t.cantidad ? tono.indicador : tono.cero))
    return alFiltrar ? <button key={t.filtro} type="button" className={clase} aria-pressed={filtro===t.filtro} onClick={()=>alFiltrar(t.filtro)}>{contenido}</button> : <Link key={t.filtro} className={clase} href={enlaceFiltroStock(t.filtro)}>{contenido}</Link>
  })}</div></div>
}
