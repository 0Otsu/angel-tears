"use client"
import { useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { anularEgresoAccion, detalleEgresoAccion } from "@/app/admin/(panel)/egresos/acciones"
import type { EgresoDetalle, ResultadoDetalle } from "@/lib/modulos/egresos/contrato"
import { formatearPrecioPublico } from "@/lib/modulos/catalogo/presentacion"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { PendingButton } from "@/components/ui/pending-button"

const fecha = (iso: string) => new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Argentina/Cordoba" }).format(new Date(iso))
export function DialogoDetalleEgreso({ resumen, alAnular }: { resumen: EgresoDetalle; alAnular: (texto: string) => void }) {
  const [abierto, abrir] = useState(false), [confirmar, pedirConfirmacion] = useState(false), [pendiente, ocupar] = useState(false)
  const [resultado, guardarResultado] = useState<ResultadoDetalle | null>(null), [error, guardarError] = useState("")
  const enCurso = useRef(false), lectura = useRef(0), router = useRouter()
  async function cargar() {
    const turno = ++lectura.current
    guardarResultado(null); guardarError(""); pedirConfirmacion(false)
    let r: ResultadoDetalle
    try { r = await detalleEgresoAccion(resumen.id) } catch { r = { estado: "error_tecnico" } }
    if (turno === lectura.current) guardarResultado(r)
  }
  function cambiar(v: boolean) {
    if (enCurso.current) return
    abrir(v)
    if (v) void cargar()
    else lectura.current++
  }
  async function anular() {
    if (enCurso.current) return
    enCurso.current = true; ocupar(true); guardarError("")
    try {
      const r = await anularEgresoAccion(resumen.id)
      if (r.estado === "ok" || r.estado === "ya_anulado") {
        guardarResultado({ estado: "ok", egreso: r.egreso }); pedirConfirmacion(false)
        alAnular(r.estado === "ok" ? "Egreso anulado. Se conserva en el historial." : "Este egreso ya estaba anulado."); router.refresh()
      } else guardarError(r.estado === "sesion_requerida" ? "Tu sesión venció. Volvé a iniciar sesión." : r.estado === "no_encontrado" ? "No encontramos este egreso." : "No pudimos anular el egreso. Podés reintentar.")
    } catch { guardarError("No pudimos anular el egreso. Podés reintentar.") }
    finally { enCurso.current = false; ocupar(false) }
  }
  const e = resultado?.estado === "ok" ? resultado.egreso : null
  return <Dialog open={abierto} onOpenChange={cambiar}><DialogTrigger asChild><Button variant="outline" className="min-h-11" aria-label={`Ver detalle de ${resumen.concepto}`}>Ver detalle</Button></DialogTrigger>
    <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto"><DialogHeader><DialogTitle>Detalle del egreso</DialogTitle><DialogDescription className="break-words">{resumen.concepto}</DialogDescription></DialogHeader>
      {!resultado && <p role="status">Cargando egreso…</p>}
      {resultado && resultado.estado !== "ok" && <div role="alert" className="space-y-2"><p>{resultado.estado === "sesion_requerida" ? "Tu sesión venció." : resultado.estado === "no_encontrado" ? "No encontramos este egreso." : "No pudimos consultar el egreso."}</p>{resultado.estado === "sesion_requerida" ? <Link href="/admin/login" className="underline">Iniciar sesión</Link> : <Button variant="outline" onClick={() => void cargar()}>Reintentar consulta</Button>}</div>}
      {e && <div className="space-y-4"><dl className="grid gap-2 text-sm"><dt>Importe</dt><dd className="font-medium">{formatearPrecioPublico(e.importe)}</dd><dt>Fecha de operación</dt><dd>{e.fechaOperacion.split("-").reverse().join("/")}</dd><dt>Observación</dt><dd className="whitespace-pre-wrap break-words">{e.nota ?? "Sin observación"}</dd><dt>Estado</dt><dd>{e.estado === "CONFIRMADO" ? "Confirmado" : "Anulado"}</dd></dl>
        <section aria-label="Historial del egreso"><h3 className="mb-2 font-medium">Historial</h3><ol className="space-y-2 text-sm"><li>Registrado: {fecha(e.creadoEn)}</li>{e.anuladoEn && <li>Anulado: {fecha(e.anuladoEn)}. No integra los totales vigentes.</li>}</ol></section>
        {e.estado === "CONFIRMADO" && (confirmar ? <div className="space-y-3 rounded-xl border p-3"><p>¿Anular este egreso? Se conservará el registro y dejará de sumar a los totales vigentes.</p><div className="flex flex-wrap gap-3"><Button variant="outline" disabled={pendiente} onClick={() => pedirConfirmacion(false)}>Volver</Button><PendingButton variant="destructive" pending={pendiente} pendingLabel="Anulando…" onClick={() => void anular()}>Confirmar anulación</PendingButton></div></div> : <Button variant="outline" className="text-destructive" onClick={() => pedirConfirmacion(true)}>Anular egreso</Button>)}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>}
    </DialogContent>
  </Dialog>
}
