"use client"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { enlaceOperaciones, periodoDeFiltros, type FiltrosOperaciones, type ErroresOperaciones, type PeriodoOperaciones } from "@/lib/presentacion/operaciones"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"

export function FiltrosOperacionesAdmin({ ruta, filtros, errores = {}, femenino = false }: { ruta: string; filtros: FiltrosOperaciones; errores?: ErroresOperaciones; femenino?: boolean }) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const firma = JSON.stringify([filtros.estado, filtros.desde, filtros.hasta, filtros.periodo])
  const [edicion, editar] = useState<{ base: string; filtros: FiltrosOperaciones } | null>(null)
  const actual = edicion?.base === firma ? edicion.filtros : filtros
  const periodo = periodoDeFiltros(actual)
  const rangoInvalido = periodo === "fechas" && actual.desde && actual.hasta && actual.desde > actual.hasta
  function cambiar(campo: keyof FiltrosOperaciones, valor: string, valido = true) {
    const siguiente = { ...actual, [campo]: valor, pagina: "1" }
    editar({ base: firma, filtros: siguiente })
    if (!valido || periodoDeFiltros(siguiente) === "fechas" && siguiente.desde && siguiente.hasta && siguiente.desde > siguiente.hasta) return
    iniciar(() => router.push(enlaceOperaciones(ruta, siguiente), { scroll: false }))
  }
  return <div role="search" aria-label="Filtrar operaciones" aria-busy={pendiente} className="space-y-3">
    <div className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className="space-y-2"><Label htmlFor="operaciones-periodo">Período</Label><select id="operaciones-periodo" value={periodo} onChange={e => cambiar("periodo", e.target.value as PeriodoOperaciones)} aria-invalid={!!errores.periodo} aria-describedby={errores.periodo ? "error-operaciones-periodo" : undefined} className="h-11 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary"><option value="mes">Este mes</option><option value="anterior">Mes anterior</option><option value="todo">Todo el historial</option><option value="fechas">Elegir fechas</option></select>{errores.periodo && <p id="error-operaciones-periodo" className="text-sm text-destructive">{errores.periodo}</p>}</div>
      <div className="space-y-2"><Label htmlFor="operaciones-estado">Estado</Label><select id="operaciones-estado" value={actual.estado} onChange={e => cambiar("estado", e.target.value)} aria-invalid={!!errores.estado} aria-describedby={errores.estado ? "error-operaciones-estado" : undefined} className="h-11 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary"><option value="">Todos</option><option value={femenino ? "CONFIRMADA" : "CONFIRMADO"}>Vigentes</option><option value={femenino ? "ANULADA" : "ANULADO"}>Anulados</option></select>{errores.estado && <p id="error-operaciones-estado" className="text-sm text-destructive">{errores.estado}</p>}</div>
      {periodo === "fechas" && (["desde", "hasta"] as const).map(c => <div key={c} className="space-y-2"><Label htmlFor={`operaciones-${c}`}>{c === "desde" ? "Desde" : "Hasta"}</Label><Input id={`operaciones-${c}`} type="date" className="min-h-11" value={actual[c]} onChange={e => cambiar(c, e.target.value, e.target.validity.valid)} aria-invalid={!!errores[c] || !!rangoInvalido} aria-describedby={errores[c] || rangoInvalido ? `error-operaciones-${c}` : undefined} />{(errores[c] || rangoInvalido) && <p id={`error-operaciones-${c}`} className="text-sm text-destructive">{rangoInvalido ? "La fecha final no puede ser anterior a la inicial." : errores[c]}</p>}</div>)}
    </div>
    {(errores.pagina || errores.limite) && <p role="alert" className="text-sm text-destructive">{errores.pagina ?? errores.limite}</p>}
    {periodo !== "fechas" && (errores.desde || errores.hasta) && <p role="alert" className="text-sm text-destructive">{errores.desde ?? errores.hasta}</p>}
    {pendiente && <span role="status" className="inline-flex items-center gap-2 text-xs text-muted-foreground"><Spinner />Actualizando listado…</span>}
  </div>
}
