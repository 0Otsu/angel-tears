"use client"
import { useEffect, useRef, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ajustarStockAccion } from "@/app/admin/(panel)/stock/acciones"
import type { FilaStock, ResultadoAjusteAdmin } from "@/lib/modulos/inventario/administracion-contrato"
import { estimarAjusteStock } from "@/lib/presentacion/inventario"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PendingButton } from "@/components/ui/pending-button"
import { Textarea } from "@/components/ui/textarea"

const TIPOS = [
  { valor: "INCREMENTO", etiqueta: "Agregar" },
  { valor: "DECREMENTO", etiqueta: "Retirar" },
] as const

function mensajeGeneral(r: ResultadoAjusteAdmin | null) {
  switch (r?.estado) {
    case "stock_insuficiente": return `No alcanza el stock: hay ${r.disponible} y querés restar ${r.requerido}.`
    case "conflicto_solicitud": return "Esta operación ya se registró con otros datos. Cerrá y volvé a abrir el ajuste."
    case "producto_sin_saldo": return "El producto no tiene inventario. Recargá la página."
    case "sesion_requerida": return "Tu sesión venció. Volvé a iniciar sesión."
    case "error_tecnico": return "No pudimos registrar el ajuste. Conservamos tus datos para que puedas reintentar."
    default: return null
  }
}

export function DialogoAjusteStock({ fila, alGuardar }: { fila: FilaStock; alGuardar: (texto: string) => void }) {
  const [abierto, abrir] = useState(false)
  const [tipo, setTipo] = useState("INCREMENTO")
  const [cantidad, setCantidad] = useState("")
  const [motivo, setMotivo] = useState("")
  const [resultado, setResultado] = useState<ResultadoAjusteAdmin | null>(null)
  const [enviando, ocupar] = useState(false)
  // Identifica la operacion logica: un reintento tras perder la respuesta no duplica el ajuste.
  const clave = useRef<string>(crypto.randomUUID())
  const enCurso = useRef(false)
  const formulario = useRef<HTMLFormElement>(null)
  const router = useRouter()
  const errores = resultado?.estado === "datos_invalidos" ? resultado.errores : {}
  // Estimacion con las mismas reglas puras; el comando vuelve a validar el saldo bajo lock.
  const estimacion = estimarAjusteStock(fila.saldo,tipo,cantidad)

  useEffect(() => {
    if (!enviando && resultado?.estado === "datos_invalidos") {
      const campo = formulario.current?.elements.namedItem(Object.keys(resultado.errores)[0])
      if (campo instanceof HTMLElement) campo.focus()
    }
  }, [enviando, resultado])

  function cambiarApertura(valor: boolean) {
    if (enviando) return
    abrir(valor)
    if (valor) { setTipo("INCREMENTO"); setCantidad(""); setMotivo(""); setResultado(null); clave.current = crypto.randomUUID() }
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enCurso.current) return
    if (estimacion && !estimacion.ok) {
      setResultado({estado:"stock_insuficiente",disponible:estimacion.disponible,requerido:estimacion.requerido})
      return
    }
    enCurso.current = true; ocupar(true)
    try {
      let respuesta: ResultadoAjusteAdmin
      try { respuesta = await ajustarStockAccion({ productoId: fila.productoId, tipo, cantidad, motivo, claveSolicitud: clave.current }) }
      catch { respuesta = { estado: "error_tecnico" } }
      setResultado(respuesta)
      if (respuesta.estado === "ok") {
        abrir(false)
        alGuardar(`Stock de ${fila.nombre}: ${respuesta.saldoResultante} unidades.`)
        router.refresh()
      }
    } finally { enCurso.current = false; ocupar(false) }
  }

  const general = mensajeGeneral(resultado)
  return <Dialog open={abierto} onOpenChange={cambiarApertura}>
    <DialogTrigger asChild><Button className="min-h-11" aria-label={`Modificar stock de ${fila.nombre}`}>Modificar stock</Button></DialogTrigger>
    <DialogContent className="max-h-[calc(100svh-2rem)] min-w-0 overflow-y-auto motion-reduce:animate-none">
      <DialogHeader><DialogTitle>Modificar stock</DialogTitle><DialogDescription className="[overflow-wrap:anywhere]">{fila.nombre} · stock actual {fila.saldo} unidades.</DialogDescription></DialogHeader>
      <form ref={formulario} onSubmit={enviar} noValidate aria-label="Ajustar stock" className="space-y-4">
        <fieldset disabled={enviando} className="space-y-4">
          <fieldset className="space-y-2"><legend className="mb-2 text-sm font-medium">Dirección del ajuste</legend><div className="grid grid-cols-2 gap-3">{TIPOS.map(t=><Label key={t.valor} className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/10"><input type="radio" name="tipo" value={t.valor} checked={tipo===t.valor} onChange={()=>setTipo(t.valor)} className="size-4 accent-primary focus-visible:outline-2 focus-visible:outline-primary" />{t.etiqueta}</Label>)}</div>
            {errores.tipo && <p className="text-sm text-destructive">{errores.tipo}</p>}</fieldset>
          <div className="space-y-2"><Label htmlFor={`ajuste-cantidad-${fila.productoId}`}>Cantidad *</Label>
            <Input id={`ajuste-cantidad-${fila.productoId}`} name="cantidad" type="number" min="1" step="1" inputMode="numeric" value={cantidad} onChange={e => setCantidad(e.target.value)} placeholder="Ej: 5" required aria-invalid={Boolean(errores.cantidad)} aria-describedby={errores.cantidad ? `error-cantidad-${fila.productoId}` : undefined} className="min-h-11" />
            {errores.cantidad && <p id={`error-cantidad-${fila.productoId}`} className="text-sm text-destructive">{errores.cantidad}</p>}</div>
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm" role="status" aria-live="polite" aria-atomic="true">
          <p className="font-medium">Así quedará el stock</p>
          <p className="mt-1">{estimacion?.ok ? <><strong className="text-xl tabular-nums">{estimacion.saldoResultante}</strong> unidades</> : estimacion ? "El saldo consultado no alcanza para restar esa cantidad." : "Ingresá la cantidad para ver el resultado."}</p>
          <p className="mt-2 text-xs text-muted-foreground">El stock se comprobará al guardar.</p>
        </div>
          <div className="space-y-2"><Label htmlFor={`ajuste-motivo-${fila.productoId}`}>Motivo *</Label>
            <Textarea id={`ajuste-motivo-${fila.productoId}`} name="motivo" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej: Recuento de inventario" required aria-invalid={Boolean(errores.motivo)} aria-describedby={errores.motivo ? `error-motivo-${fila.productoId}` : undefined} />
            {errores.motivo && <p id={`error-motivo-${fila.productoId}`} className="text-sm text-destructive">{errores.motivo}</p>}</div>
        </fieldset>
        {(general || errores.productoId || errores.claveSolicitud) && <div role="alert" className="space-y-2 text-sm text-destructive"><p>{general ?? errores.productoId ?? errores.claveSolicitud}</p>{resultado?.estado === "sesion_requerida" && <Link href="/admin/login" className="underline">Iniciar sesión</Link>}</div>}
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="outline" className="min-h-11" disabled={enviando} onClick={() => cambiarApertura(false)}>Cancelar</Button>
          <PendingButton className="min-h-11" type="submit" pending={enviando} disabled={estimacion!==null && !estimacion.ok} pendingLabel="Guardando…">Registrar ajuste</PendingButton>
        </div>
      </form>
    </DialogContent>
  </Dialog>
}
