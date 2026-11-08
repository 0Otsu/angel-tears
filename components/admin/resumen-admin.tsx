import Link from "next/link"
import { CircleCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { EstadoStock, estilosEstadoStock } from "./estado-stock"
import type { FilaStock } from "@/lib/modulos/inventario/administracion-contrato"
import { estadoVisualStock, ordenarAtencionStock } from "@/lib/presentacion/inventario"
import { EncabezadoAdmin, PanelAdmin } from "./piezas-admin"
import { ResumenAlertasStock } from "./resumen-alertas-stock"

export function ResumenAdmin({filas, errorCarga = false}: {filas: FilaStock[]; errorCarga?: boolean}) {
  const alertas = ordenarAtencionStock(filas).filter(f=>estadoVisualStock(f.saldo)!=="disponible")
  return <>
    <EncabezadoAdmin titulo="Resumen" descripcion="Inventario para revisar." simple />
    {errorCarga ? <PanelAdmin className="space-y-3 p-5"><p role="alert">No pudimos consultar las alertas de inventario.</p><Link href="/admin" className="underline">Reintentar consulta</Link></PanelAdmin> : <>
      <ResumenAlertasStock filas={filas} />
      <PanelAdmin className="p-5"><h2 className="mb-4 font-serif text-xl">Reposición pendiente</h2>
        {alertas.length ? <ul className="divide-y">{alertas.map(f=><li key={f.productoId} className={cn("flex flex-wrap items-center justify-between gap-3 rounded-lg px-3 py-3", estilosEstadoStock[estadoVisualStock(f.saldo)].fila)}><div className="min-w-0"><p className="font-medium [overflow-wrap:anywhere]">{f.nombre}</p><div className="mt-1 flex flex-wrap items-center gap-2"><span className={cn("text-sm font-medium tabular-nums", estilosEstadoStock[estadoVisualStock(f.saldo)].texto)}>{f.saldo} unidades</span><EstadoStock estado={estadoVisualStock(f.saldo)} /></div></div><Link className="inline-flex min-h-11 items-center rounded-md px-2 text-sm text-primary underline focus-visible:outline-2" href={`/admin/stock?estado=${estadoVisualStock(f.saldo)}`}>Revisar inventario<span className="sr-only">: {f.nombre}</span></Link></li>)}</ul> : <div className="flex items-center gap-2 text-sm text-primary">{filas.length>0 && <CircleCheck className="size-4 shrink-0" aria-hidden="true" />}<p>{filas.length ? "Todo el inventario está al día" : "Todavía no hay productos con inventario."}</p></div>}
      </PanelAdmin>
    </>}
  </>
}
