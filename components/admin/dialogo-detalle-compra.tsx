"use client"
import { useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { anularCompraAccion, consultarDetalleCompraAccion } from "@/app/admin/(panel)/compras/acciones"
import type { ResultadoAnulacionAdmin, ResultadoDetalleAdmin } from "@/lib/modulos/compras/administracion-contrato"
import type { CompraDetalle, ResumenCompra } from "@/lib/modulos/compras/contrato"
import { formatearPrecioPublico } from "@/lib/modulos/catalogo/presentacion"
import { etiquetaEstadoCompra, formatearFechaCompra, SIN_PROVEEDOR } from "@/lib/presentacion/compras"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { PendingButton } from "@/components/ui/pending-button"
import { EtiquetaEstado } from "./piezas-admin"

type Carga =
  | { tipo: "cargando" }
  | { tipo: "ok"; compra: CompraDetalle }
  | { tipo: "error"; mensaje: string; sesion?: boolean }

function mensajeDeConsulta(r: Exclude<ResultadoDetalleAdmin, { estado: "ok" }>): Extract<Carga, { tipo: "error" }> {
  switch (r.estado) {
    case "no_encontrada": return { tipo: "error", mensaje: "No encontramos esta compra. Recargá la página." }
    case "sesion_requerida": return { tipo: "error", mensaje: "Tu sesión venció. Volvé a iniciar sesión.", sesion: true }
    default: return { tipo: "error", mensaje: "No pudimos consultar la compra. Intentá de nuevo." }
  }
}

type ErrorAnulacion = { mensaje: string; faltantes?: { productoId: string; texto: string }[]; sesion?: boolean }

function errorDeAnulacion(r: Exclude<ResultadoAnulacionAdmin, { estado: "ok" | "ya_anulada" }>): ErrorAnulacion {
  switch (r.estado) {
    case "reversion_bloqueada": return {
      mensaje: "No se puede anular: parte del stock de esta compra ya no está disponible, y restarlo dejaría el stock en negativo. No se hizo ningún cambio.",
      faltantes: r.faltantes.map((f) => ({ productoId: f.productoId, texto: `${f.nombreProducto}: hay ${f.disponible} y habría que restar ${f.requerido}.` })),
    }
    case "no_encontrada": return { mensaje: "No encontramos esta compra. Recargá la página." }
    case "sesion_requerida": return { mensaje: "Tu sesión venció. Volvé a iniciar sesión.", sesion: true }
    default: return { mensaje: "No pudimos anular la compra. No se hizo ningún cambio; podés reintentar." }
  }
}

export function DialogoDetalleCompra({ resumen, alAnular }: { resumen: ResumenCompra; alAnular: (texto: string) => void }) {
  const [abierto, abrir] = useState(false)
  const [carga, setCarga] = useState<Carga>({ tipo: "cargando" })
  const [confirmando, confirmar] = useState(false)
  const [anulando, ocupar] = useState(false)
  const [errorAnulacion, setErrorAnulacion] = useState<ErrorAnulacion | null>(null)
  const enCurso = useRef(false)
  const router = useRouter()
  const etiqueta = `compra del ${formatearFechaCompra(resumen.fechaOperacion)} por ${formatearPrecioPublico(resumen.total)}`

  async function cambiarApertura(valor: boolean) {
    if (anulando) return
    abrir(valor)
    if (!valor) return
    confirmar(false); setErrorAnulacion(null); setCarga({ tipo: "cargando" })
    let respuesta: ResultadoDetalleAdmin
    try { respuesta = await consultarDetalleCompraAccion(resumen.id) } catch { respuesta = { estado: "error_tecnico" } }
    setCarga(respuesta.estado === "ok" ? { tipo: "ok", compra: respuesta.compra } : mensajeDeConsulta(respuesta))
  }

  async function anular() {
    if (enCurso.current) return
    enCurso.current = true; ocupar(true); setErrorAnulacion(null)
    try {
      let respuesta: ResultadoAnulacionAdmin
      try { respuesta = await anularCompraAccion(resumen.id) } catch { respuesta = { estado: "error_tecnico" } }
      if (respuesta.estado === "ok" || respuesta.estado === "ya_anulada") {
        abrir(false)
        alAnular(respuesta.estado === "ok" ? "Compra anulada. El stock se revirtió." : "Esa compra ya estaba anulada.")
        router.refresh()
      } else {
        // La compra sigue vigente: se vuelve a la vista de detalle con el motivo.
        confirmar(false)
        setErrorAnulacion(errorDeAnulacion(respuesta))
      }
    } finally { enCurso.current = false; ocupar(false) }
  }

  const compra = carga.tipo === "ok" ? carga.compra : null
  return <Dialog open={abierto} onOpenChange={cambiarApertura}>
    <DialogTrigger asChild><Button variant="outline" className="min-h-11" aria-label={`Ver detalle de la ${etiqueta}`}>Ver detalle</Button></DialogTrigger>
    <DialogContent className="max-h-[calc(100svh-2rem)] min-w-0 overflow-y-auto motion-reduce:animate-none sm:max-w-2xl">
      <DialogHeader><DialogTitle>Detalle de la compra</DialogTitle><DialogDescription>{formatearFechaCompra(resumen.fechaOperacion)} · {resumen.nombreProveedor ?? SIN_PROVEEDOR}</DialogDescription></DialogHeader>
      {carga.tipo === "cargando" && <p role="status" className="text-sm text-muted-foreground">Cargando la compra…</p>}
      {carga.tipo === "error" && <div role="alert" className="space-y-2 text-sm text-destructive"><p>{carga.mensaje}</p>{carga.sesion && <Link href="/admin/login" className="underline">Iniciar sesión</Link>}</div>}
      {compra && <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <EtiquetaEstado tono={compra.estado === "CONFIRMADA" ? "oliva" : "alerta"}>{etiquetaEstadoCompra(compra.estado)}</EtiquetaEstado>
          <span className="text-muted-foreground">Cargada el {new Date(compra.creadoEn).toLocaleString("es-AR")}</span>
          {compra.anuladoEn && <span className="text-muted-foreground">Anulada el {new Date(compra.anuladoEn).toLocaleString("es-AR")}</span>}
        </div>
        {compra.nota && <p className="rounded-lg bg-card/60 p-3 text-sm [overflow-wrap:anywhere]"><span className="font-medium">Nota: </span>{compra.nota}</p>}
        <table className="w-full text-sm" aria-label="Productos de la compra">
          <thead><tr className="border-b text-left text-xs text-muted-foreground"><th scope="col" className="py-2 pr-2 font-medium">Producto</th><th scope="col" className="px-2 py-2 text-right font-medium">Cant.</th><th scope="col" className="px-2 py-2 text-right font-medium">Costo</th><th scope="col" className="py-2 pl-2 text-right font-medium">Subtotal</th></tr></thead>
          <tbody>{compra.lineas.map((l) => <tr key={l.numeroLinea} className="border-b border-border/50"><td className="py-2 pr-2 [overflow-wrap:anywhere]">{l.nombreProducto}</td><td className="px-2 py-2 text-right tabular-nums">{l.cantidad}</td><td className="px-2 py-2 text-right tabular-nums">{formatearPrecioPublico(l.costoUnitario)}</td><td className="py-2 pl-2 text-right tabular-nums">{formatearPrecioPublico(l.subtotal)}</td></tr>)}</tbody>
          <tfoot><tr><th scope="row" colSpan={3} className="pt-3 text-right font-medium">Total</th><td className="pt-3 text-right text-base font-semibold tabular-nums">{formatearPrecioPublico(compra.total)}</td></tr></tfoot>
        </table>
        <p className="text-xs text-muted-foreground">Los costos y nombres son los del momento de la compra. Las compras confirmadas no se editan: para corregir un costo, anulá la compra y registrá otra.</p>
        {errorAnulacion && <div role="alert" className="space-y-2 text-sm text-destructive">
          <p>{errorAnulacion.mensaje}</p>
          {errorAnulacion.faltantes && <ul className="list-disc pl-5">{errorAnulacion.faltantes.map((f) => <li key={f.productoId}>{f.texto}</li>)}</ul>}
          {errorAnulacion.sesion && <Link href="/admin/login" className="underline">Iniciar sesión</Link>}
        </div>}
        {compra.estado === "CONFIRMADA" && (confirmando
          ? <div className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4" role="group" aria-label="Confirmar la anulación">
              <p className="text-sm font-medium">¿Anular esta compra?</p>
              <p className="text-sm text-muted-foreground">Las unidades compradas se restan del stock una sola vez. Si alguna ya se vendió o consumió y el stock no alcanza, no se anula nada. La compra queda en el historial como anulada y no se puede deshacer.</p>
              <div className="flex flex-wrap justify-end gap-3">
                <Button type="button" variant="outline" className="min-h-11" disabled={anulando} onClick={() => confirmar(false)}>No, volver</Button>
                <PendingButton type="button" variant="destructive" className="min-h-11" pending={anulando} pendingLabel="Anulando…" onClick={anular}>Sí, anular compra</PendingButton>
              </div>
            </div>
          : <div className="flex justify-end"><Button type="button" variant="destructive" className="min-h-11" onClick={() => { setErrorAnulacion(null); confirmar(true) }}>Anular compra</Button></div>)}
      </div>}
    </DialogContent>
  </Dialog>
}
