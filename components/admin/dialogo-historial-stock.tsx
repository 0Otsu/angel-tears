"use client"
import { CargandoAdmin } from "./cargando-admin"
import { useState, type ReactNode } from "react"
import { consultarHistorialAccion } from "@/app/admin/(panel)/stock/acciones"
import type { FilaStock, MovimientoHistorial, ResultadoHistorialAdmin } from "@/lib/modulos/inventario/administracion-contrato"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

const ETIQUETA_TIPO = { INICIAL: "Saldo inicial", INCREMENTO: "Ingreso", DECREMENTO: "Egreso" } as const
const formato = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" })

type Estado = { cargando: true } | { cargando: false; resultado: ResultadoHistorialAdmin }

export function DialogoHistorialStock({ fila, disparador, alCerrar }: { fila: FilaStock; disparador?: ReactNode; alCerrar?:()=>void }) {
  const [estado, setEstado] = useState<Estado | null>(null)

  async function cargar() {
    setEstado({ cargando: true })
    let resultado: ResultadoHistorialAdmin
    try { resultado = await consultarHistorialAccion(fila.productoId) } catch { resultado = { estado: "error_tecnico" } }
    setEstado({ cargando: false, resultado })
  }

  const resultado = estado && !estado.cargando ? estado.resultado : null
  const movimientos: MovimientoHistorial[] = resultado?.estado === "ok" ? resultado.movimientos : []
  return <Dialog onOpenChange={abierto => { if (abierto) void cargar() }}>
    <DialogTrigger asChild>{disparador ?? <Button variant="outline" className="min-h-11" aria-label={`Ver historial de ${fila.nombre}`}>Historial</Button>}</DialogTrigger>
    <DialogContent className="max-h-[85vh] overflow-y-auto" onCloseAutoFocus={alCerrar ? e=>{e.preventDefault();alCerrar()} : undefined}>
      <DialogHeader><DialogTitle>Historial de stock</DialogTitle><DialogDescription>{fila.nombre} · últimos ajustes manuales.</DialogDescription></DialogHeader>
      {estado?.cargando && <CargandoAdmin tipo="detalle" nombre="historial"/>}
      {resultado && resultado.estado !== "ok" && <div role="alert" className="space-y-2 text-sm text-destructive"><p>{resultado.estado === "sesion_requerida" ? "Tu sesión venció. Volvé a iniciar sesión." : resultado.estado === "no_encontrado" ? "El producto ya no tiene inventario." : "No pudimos consultar el historial."}</p>{resultado.estado === "error_tecnico" && <Button variant="outline" onClick={() => void cargar()}>Reintentar</Button>}</div>}
      {resultado?.estado === "ok" && (movimientos.length === 0 ? <p className="text-sm text-muted-foreground">Este producto todavía no tiene movimientos.</p>
        : <ul aria-label="Movimientos de stock" className="space-y-3">{movimientos.map(m => <li key={m.id} className="rounded-lg border p-3 text-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2"><span className="font-medium">{ETIQUETA_TIPO[m.tipoAjuste]}: <span className="tabular-nums">{m.delta > 0 ? `+${m.delta}` : m.delta}</span></span><span className="text-xs text-muted-foreground">{formato.format(new Date(m.creadoEn))}</span></div>
          <p className="mt-1 break-words">{m.motivo}</p>
          <p className="mt-1 text-xs text-muted-foreground">Stock resultante: {m.saldoResultante} · {m.actor}</p>
        </li>)}</ul>)}
    </DialogContent>
  </Dialog>
}
