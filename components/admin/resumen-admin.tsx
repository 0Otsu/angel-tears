import Link from "next/link"
import { CircleCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { EstadoStock, estilosEstadoStock } from "./estado-stock"
import type { FilaStock } from "@/lib/modulos/inventario/administracion-contrato"
import { estadoVisualStock, ordenarAtencionStock } from "@/lib/presentacion/inventario"
import { EncabezadoAdmin, PanelAdmin } from "./piezas-admin"
import { ResumenAlertasStock } from "./resumen-alertas-stock"
import { IndicadoresFinanzas } from "./indicadores-finanzas"
import { EvolucionFinanzas } from "./evolucion-finanzas"
import { parametrosPeriodo } from "@/lib/modulos/finanzas/periodo"
import { FiltroPeriodoFinanzas } from "./filtro-periodo-finanzas"
import { SalidasFinanzas } from "./salidas-finanzas"
import type { FiltroFinanzas, ResultadoFinanzas } from "@/lib/modulos/finanzas/contrato"

export function ResumenAdmin({filas, errorCarga = false, finanzas, filtro = {}}: {filas: FilaStock[]; errorCarga?: boolean; finanzas?: ResultadoFinanzas; filtro?: FiltroFinanzas}) {
  const alertas = ordenarAtencionStock(filas).filter(f=>estadoVisualStock(f.saldo)!=="disponible")
  return <>
    <EncabezadoAdmin titulo="Resumen" simple>{finanzas && <FiltroPeriodoFinanzas filtro={filtro} errores={finanzas.estado === "datos_invalidos" ? finanzas.errores : undefined} />}</EncabezadoAdmin>
    {finanzas && (finanzas.estado === "ok" ? <><IndicadoresFinanzas datos={finanzas}/>{finanzas.resultado === null && <Link className="inline-flex min-h-11 items-center text-sm text-primary underline" href={`/admin?${parametrosPeriodo(finanzas.periodo)}`}>Reintentar consulta</Link>}</> : <p role="alert">Revisá el período para consultar el resumen económico.</p>)}
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.9fr)_minmax(300px,1fr)]">
      <PanelAdmin className="min-w-0 p-4 sm:p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="font-serif text-xl">Ingresos frente a salidas</h2></div>
      {finanzas?.estado === "ok" ? finanzas.resultado === null ? <p className="py-10 text-sm text-muted-foreground">El gráfico no está disponible mientras falten datos.</p> : <EvolucionFinanzas key={`${finanzas.periodo.desde}/${finanzas.periodo.hasta}`} puntos={finanzas.evolucion} agrupacion={finanzas.periodo.agrupacion} periodo={finanzas.periodo} dashboard/> : <p className="py-10 text-sm text-muted-foreground">No pudimos consultar el gráfico.</p>}</PanelAdmin>
      <aside aria-label="Inventario y reposición" className="min-w-0"><PanelAdmin className="space-y-5 p-4">
    {errorCarga ? <PanelAdmin className="space-y-3 p-5"><p role="alert">No pudimos consultar las alertas de inventario.</p><Link href="/admin" className="underline">Reintentar consulta</Link></PanelAdmin> : <>
      <div><h2 className="mb-3 font-serif text-xl">Inventario actual</h2><ResumenAlertasStock filas={filas} /></div>
      <PanelAdmin className="border-0 bg-transparent p-0 shadow-none!"><h2 className="mb-4 font-serif text-xl">Reposición pendiente</h2>
        {alertas.length ? <ul className="divide-y">{alertas.map(f=><li key={f.productoId} className={cn("flex flex-wrap items-center justify-between gap-3 rounded-lg px-3 py-3", estilosEstadoStock[estadoVisualStock(f.saldo)].fila)}><div className="min-w-0"><p className="font-medium [overflow-wrap:anywhere]">{f.nombre}</p><div className="mt-1 flex flex-wrap items-center gap-2"><span className={cn("text-sm font-medium tabular-nums", estilosEstadoStock[estadoVisualStock(f.saldo)].texto)}>{f.saldo} unidades</span><EstadoStock estado={estadoVisualStock(f.saldo)} /></div></div><Link className="inline-flex min-h-11 items-center rounded-md px-2 text-xs text-primary underline focus-visible:outline-2" href={`/admin/productos/${f.productoId}/editar#existencias`}>Ver existencias<span className="sr-only">: {f.nombre}</span></Link></li>)}</ul> : <div className="flex items-center gap-2 text-sm text-primary">{filas.length>0 && <CircleCheck className="size-4 shrink-0" aria-hidden="true" />}<p>{filas.length ? "Todo el inventario está al día" : "Todavía no hay productos con inventario."}</p></div>}
      </PanelAdmin>
    </>}
      </PanelAdmin></aside>
    </div>
    {finanzas?.estado === "ok" && <>
      <nav aria-label="Consultar operaciones del período" className="flex flex-wrap gap-4 text-sm">{([['ventas','Ventas'],['compras','Compras'],['gastos','Gastos']] as const).map(([ruta,nombre]) => <Link key={ruta} href={`/admin/${ruta}?${new URLSearchParams({periodo:'fechas',desde:finanzas.periodo.desde,hasta:finanzas.periodo.hasta})}`} className="inline-flex min-h-11 items-center text-primary underline">Consultar {nombre.toLowerCase()}</Link>)}</nav>
      <details className="rounded-2xl border border-border/60 p-4"><summary className="min-h-11 cursor-pointer text-sm text-primary focus-visible:outline-2">Consultar compras y gastos juntos</summary><SalidasFinanzas datos={finanzas}/></details>
    </>}
  </>
}
