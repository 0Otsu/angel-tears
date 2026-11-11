"use client"
import { CargandoAdmin } from "./cargando-admin"
import { useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { anularVentaAccion, consultarDetalleVentaAccion } from "@/app/admin/(panel)/ventas/acciones"
import type { ResultadoAnulacionAdmin, ResultadoDetalleAdmin } from "@/lib/modulos/ventas/administracion-contrato"
import type { ResumenVenta, VentaDetalle } from "@/lib/modulos/ventas/contrato"
import { nombreDeComprador } from "@/lib/modulos/ventas/reglas-venta"
import { formatearPrecioPublico } from "@/lib/modulos/catalogo/presentacion"
import { etiquetaEstadoVenta, formatearFechaOperacion } from "@/lib/presentacion/ventas"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { PendingButton } from "@/components/ui/pending-button"
import { EtiquetaEstado } from "./piezas-admin"

type Carga =
  | { tipo: "cargando" }
  | { tipo: "ok"; venta: VentaDetalle }
  | { tipo: "error"; mensaje: string; sesion?: boolean }

function mensajeDeConsulta(r: Exclude<ResultadoDetalleAdmin, { estado: "ok" }>): Extract<Carga, { tipo: "error" }> {
  switch (r.estado) {
    case "no_encontrada": return { tipo: "error", mensaje: "No encontramos esta venta. Recargá la página." }
    case "sesion_requerida": return { tipo: "error", mensaje: "Tu sesión venció. Volvé a iniciar sesión.", sesion: true }
    default: return { tipo: "error", mensaje: "No pudimos consultar la venta. Intentá de nuevo." }
  }
}

function mensajeDeAnulacion(r: Exclude<ResultadoAnulacionAdmin, { estado: "ok" | "ya_anulada" }>): string {
  switch (r.estado) {
    case "no_encontrada": return "No encontramos esta venta. Recargá la página."
    case "sesion_requerida": return "Tu sesión venció. Volvé a iniciar sesión."
    default: return "No pudimos anular la venta. No se hizo ningún cambio; podés reintentar."
  }
}

export function DialogoDetalleVenta({ resumen, alAnular }: { resumen: ResumenVenta; alAnular: (texto: string) => void }) {
  const [abierto, abrir] = useState(false)
  const [carga, setCarga] = useState<Carga>({ tipo: "cargando" })
  const [confirmando, confirmar] = useState(false)
  const [anulando, ocupar] = useState(false)
  const [errorAnulacion, setErrorAnulacion] = useState<string | null>(null)
  const enCurso = useRef(false)
  const router = useRouter()
  const etiqueta = `venta del ${formatearFechaOperacion(resumen.fechaOperacion)} por ${formatearPrecioPublico(resumen.total)}`

  async function cambiarApertura(valor: boolean) {
    if (anulando) return
    abrir(valor)
    if (!valor) return
    confirmar(false); setErrorAnulacion(null); setCarga({ tipo: "cargando" })
    let respuesta: ResultadoDetalleAdmin
    try { respuesta = await consultarDetalleVentaAccion(resumen.id) } catch { respuesta = { estado: "error_tecnico" } }
    setCarga(respuesta.estado === "ok" ? { tipo: "ok", venta: respuesta.venta } : mensajeDeConsulta(respuesta))
  }

  async function anular() {
    if (enCurso.current) return
    enCurso.current = true; ocupar(true); setErrorAnulacion(null)
    try {
      let respuesta: ResultadoAnulacionAdmin
      try { respuesta = await anularVentaAccion(resumen.id) } catch { respuesta = { estado: "error_tecnico" } }
      if (respuesta.estado === "ok" || respuesta.estado === "ya_anulada") {
        abrir(false)
        alAnular(respuesta.estado === "ok" ? "Venta anulada. Las unidades volvieron al stock." : "Esa venta ya estaba anulada.")
        router.refresh()
      } else setErrorAnulacion(mensajeDeAnulacion(respuesta))
    } finally { enCurso.current = false; ocupar(false) }
  }

  const venta = carga.tipo === "ok" ? carga.venta : null
  return <Dialog open={abierto} onOpenChange={cambiarApertura}>
    <DialogTrigger asChild><Button variant="outline" className="min-h-11" aria-label={`Ver detalle de la ${etiqueta}`}>Ver detalle</Button></DialogTrigger>
    <DialogContent className="max-h-[calc(100svh-2rem)] min-w-0 overflow-y-auto motion-reduce:animate-none sm:max-w-2xl">
      <DialogHeader><DialogTitle>Detalle de la venta</DialogTitle><DialogDescription>{formatearFechaOperacion(resumen.fechaOperacion)} · {nombreDeComprador(resumen.comprador)}</DialogDescription></DialogHeader>
      {carga.tipo === "cargando" && <CargandoAdmin tipo="detalle" nombre="venta"/>}
      {carga.tipo === "error" && <div role="alert" className="space-y-2 text-sm text-destructive"><p>{carga.mensaje}</p>{carga.sesion && <Link href="/admin/login" className="underline">Iniciar sesión</Link>}</div>}
      {venta && <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <EtiquetaEstado tono={venta.estado === "CONFIRMADA" ? "oliva" : "alerta"}>{etiquetaEstadoVenta(venta.estado)}</EtiquetaEstado>
          <span className="text-muted-foreground">Cargada el {new Date(venta.creadoEn).toLocaleString("es-AR")}</span>
          {venta.anuladoEn && <span className="text-muted-foreground">Anulada el {new Date(venta.anuladoEn).toLocaleString("es-AR")}</span>}
        </div>
        <table className="w-full text-sm" aria-label="Productos de la venta">
          <thead><tr className="border-b text-left text-xs text-muted-foreground"><th scope="col" className="py-2 pr-2 font-medium">Producto</th><th scope="col" className="px-2 py-2 text-right font-medium">Cant.</th><th scope="col" className="px-2 py-2 text-right font-medium">Precio</th><th scope="col" className="py-2 pl-2 text-right font-medium">Subtotal</th></tr></thead>
          <tbody>{venta.lineas.map((l) => <tr key={l.numeroLinea} className="border-b border-border/50"><td className="py-2 pr-2 [overflow-wrap:anywhere]">{l.nombreProducto}</td><td className="px-2 py-2 text-right tabular-nums">{l.cantidad}</td><td className="px-2 py-2 text-right tabular-nums">{formatearPrecioPublico(l.precioUnitario)}</td><td className="py-2 pl-2 text-right tabular-nums">{formatearPrecioPublico(l.subtotal)}</td></tr>)}</tbody>
          <tfoot><tr><th scope="row" colSpan={3} className="pt-3 text-right font-medium">Total</th><td className="pt-3 text-right text-base font-semibold tabular-nums">{formatearPrecioPublico(venta.total)}</td></tr></tfoot>
        </table>
        <p className="text-xs text-muted-foreground">Los precios y nombres son los del momento de la venta. Las ventas confirmadas no se editan; si hubo un error, se anulan y se registra una nueva.</p>
        {errorAnulacion && <p role="alert" className="text-sm text-destructive">{errorAnulacion}</p>}
        {venta.estado === "CONFIRMADA" && (confirmando
          ? <div className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4" role="group" aria-label="Confirmar la anulación">
              <p className="text-sm font-medium">¿Anular esta venta?</p>
              <p className="text-sm text-muted-foreground">Las unidades vuelven al stock una sola vez. La venta queda en el historial como anulada y no se puede deshacer.</p>
              <div className="flex flex-wrap justify-end gap-3">
                <Button type="button" variant="outline" className="min-h-11" disabled={anulando} onClick={() => confirmar(false)}>No, volver</Button>
                <PendingButton type="button" variant="destructive" className="min-h-11" pending={anulando} pendingLabel="Anulando…" onClick={anular}>Sí, anular venta</PendingButton>
              </div>
            </div>
          : <div className="flex justify-end"><Button type="button" variant="destructive" className="min-h-11" onClick={() => confirmar(true)}>Anular venta</Button></div>)}
      </div>}
    </DialogContent>
  </Dialog>
}
