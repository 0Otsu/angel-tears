import { FiltroAdmin,BotonFiltrar } from "./filtro-admin"
import Link from "next/link"
import type { OperacionSalida, ResumenFinanzas } from "@/lib/modulos/finanzas/contrato"
import { parametrosPeriodo } from "@/lib/modulos/finanzas/periodo"
import { fechaFinanzas, importeFinanzas } from "@/lib/presentacion/finanzas"
import { EtiquetaEstado, PanelAdmin, TituloPanel } from "./piezas-admin"

function Tipo({ fila }: { fila: OperacionSalida }) {
  return <span className="text-xs text-muted-foreground">{fila.tipo === "compras" ? "Compra" : "Gasto"}</span>
}
function Estado({ fila }: { fila: OperacionSalida }) {
  return <EtiquetaEstado tono={fila.anulada ? "neutro" : "oliva"}>{fila.anulada ? "Anulado · excluido" : "Vigente"}</EtiquetaEstado>
}
function Enlace({ fila, datos }: { fila: OperacionSalida; datos: ResumenFinanzas }) {
  const p = new URLSearchParams({ desde: datos.periodo.desde, hasta: datos.periodo.hasta })
  return <Link className="inline-flex min-h-11 items-center text-sm text-primary underline" aria-label={`Consultar ${fila.tipo === "compras" ? "compra" : "gasto"}: ${fila.concepto}`} href={`/admin/${fila.tipo === "compras" ? "compras" : "gastos"}?${p}`}>Consultar</Link>
}

export function SalidasFinanzas({ datos }: { datos: ResumenFinanzas }) {
  const faltaFuente = datos.fuentes.compras.estado === "error" || datos.fuentes.egresos.estado === "error"
  return <PanelAdmin>
    <TituloPanel titulo="Movimientos del período" detalle="Compras y gastos" />
    <div className="px-4 pb-5 lg:px-6">
      <FiltroAdmin action="/admin" className="mb-5 flex flex-wrap items-end gap-3">
        {[...parametrosPeriodo(datos.periodo)].map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        <div className="w-full min-w-0 sm:w-auto sm:max-w-56 sm:flex-1"><label htmlFor="tipo-salida" className="mb-1.5 block text-sm">Tipo de operación</label><select id="tipo-salida" name="tipo" defaultValue={datos.periodo.tipo} className="h-11 w-full rounded-xl border bg-background px-3 text-sm"><option value="todos">Compras y gastos</option><option value="compras">Compras</option><option value="egresos">Gastos</option></select></div>
        <div className="w-full min-w-0 sm:w-auto sm:max-w-48 sm:flex-1"><label htmlFor="estado-salida" className="mb-1.5 block text-sm">Estado</label><select id="estado-salida" name="estado" defaultValue={datos.periodo.estado} className="h-11 w-full rounded-xl border bg-background px-3 text-sm"><option value="todos">Todos los estados</option><option value="vigente">Vigentes</option><option value="anulado">Anulados</option></select></div>
        <BotonFiltrar variant="outline" className="min-h-11">Filtrar operaciones</BotonFiltrar>
      </FiltroAdmin>
      {faltaFuente && <p role="alert" className="mb-4 text-sm text-destructive">La consulta está incompleta. No pudimos obtener todas las compras y gastos.</p>}
      {!datos.operaciones.length ? <p className="py-5 text-sm text-muted-foreground">{faltaFuente ? "No hay operaciones disponibles para mostrar." : "No hay compras ni gastos con estos filtros."}</p> : <>
        <div className="hidden md:block"><table className="w-full table-fixed text-left text-sm" aria-label="Compras y gastos del período"><thead className="border-b text-xs text-muted-foreground"><tr><th scope="col" className="w-28 py-3">Fecha</th><th scope="col" className="py-3">Operación</th><th scope="col" className="w-40 px-2 py-3 text-right">Importe</th><th scope="col" className="w-40 px-2 py-3">Estado</th><th scope="col" className="w-24 py-3"><span className="sr-only">Acceso</span></th></tr></thead><tbody className="divide-y">{datos.operaciones.map(f => <tr key={`${f.tipo}-${f.id}`}><td className="py-3 text-xs">{fechaFinanzas(f.fecha)}</td><td className="py-3 pr-3 [overflow-wrap:anywhere]"><Tipo fila={f} /><p className="mt-1">{f.concepto}</p></td><td className="px-2 py-3 text-right tabular-nums [overflow-wrap:anywhere]">{importeFinanzas(f.importe)}</td><td className="px-2 py-3"><Estado fila={f} /></td><td className="py-3 text-right"><Enlace fila={f} datos={datos} /></td></tr>)}</tbody></table></div>
        <ul className="space-y-3 md:hidden" aria-label="Compras y gastos del período">{datos.operaciones.map(f => <li key={`${f.tipo}-${f.id}`} className="rounded-xl border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><Tipo fila={f} /><span className="text-xs text-muted-foreground">{fechaFinanzas(f.fecha)}</span></div><p className="my-2 text-sm [overflow-wrap:anywhere]">{f.concepto}</p><p className="mb-2 font-medium tabular-nums [overflow-wrap:anywhere]">{importeFinanzas(f.importe)}</p><div className="flex flex-wrap items-center justify-between gap-2"><Estado fila={f} /><Enlace fila={f} datos={datos} /></div></li>)}</ul>
      </>}
      {datos.hayMas && <p role="status" className="mt-4 text-sm text-muted-foreground">Se muestran las 50 operaciones más recientes. Acotá el período o consultá cada módulo para ver más. Los totales y el gráfico incluyen todo el período.</p>}
    </div>
  </PanelAdmin>
}
