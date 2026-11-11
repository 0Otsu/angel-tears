"use client"
import { useEffect, useRef, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { registrarEgresoAccion } from "@/app/admin/(panel)/egresos/acciones"
import type { ResultadoRegistro } from "@/lib/modulos/egresos/contrato"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { PendingButton } from "@/components/ui/pending-button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

export function DialogoRegistroEgreso({ alGuardar }: { alGuardar: (texto: string) => void }) {
  const router = useRouter()
  const [abierto, abrir] = useState(false), [enviando, ocupar] = useState(false)
  const [resultado, guardarResultado] = useState<ResultadoRegistro | null>(null)
  const clave = useRef(""), enCurso = useRef(false), formulario = useRef<HTMLFormElement>(null)
  const errores = resultado?.estado === "datos_invalidos" ? resultado.errores : {}
  useEffect(() => {
    if (resultado?.estado === "datos_invalidos") {
      const campo = formulario.current?.elements.namedItem(Object.keys(resultado.errores)[0])
      if (campo instanceof HTMLElement) campo.focus()
    }
  }, [resultado])
  function cambiar(valor: boolean) {
    if (enCurso.current) return
    abrir(valor)
    if (valor) { clave.current = crypto.randomUUID(); guardarResultado(null) }
  }
  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (enCurso.current) return
    const datos = Object.fromEntries(new FormData(e.currentTarget))
    enCurso.current = true; ocupar(true)
    try {
      let r: ResultadoRegistro
      try { r = await registrarEgresoAccion({ ...datos, claveSolicitud: clave.current }) }
      catch { r = { estado: "error_tecnico" } }
      guardarResultado(r)
      if (r.estado === "ok") { abrir(false); alGuardar(`Egreso registrado: ${r.egreso.concepto}.`); router.refresh() }
    } finally { enCurso.current = false; ocupar(false) }
  }
  const campos = [{ id: "concepto", titulo: "Concepto *", tipo: "text" }, { id: "importe", titulo: "Importe (ARS) *", tipo: "text" }, { id: "fechaOperacion", titulo: "Fecha de operación *", tipo: "date" }] as const
  return <Dialog open={abierto} onOpenChange={cambiar}>
    <DialogTrigger asChild><Button className="min-h-11">Registrar egreso</Button></DialogTrigger>
    <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto"><DialogHeader><DialogTitle>Registrar egreso manual</DialogTitle><DialogDescription>Para gastos que no sean compras de mercadería. Las compras se registran desde Compras.</DialogDescription></DialogHeader>
      <form ref={formulario} onSubmit={enviar} noValidate aria-label="Registrar egreso manual" className="space-y-4">
        <fieldset disabled={enviando} className="space-y-4">
          {campos.map(c => <div key={c.id} className="space-y-2"><Label htmlFor={`egreso-${c.id}`}>{c.titulo}</Label>
            <Input id={`egreso-${c.id}`} name={c.id} type={c.tipo} inputMode={c.id === "importe" ? "decimal" : undefined} required aria-invalid={!!errores[c.id]} aria-describedby={errores[c.id] ? `error-egreso-${c.id}` : c.id === "importe" ? "ayuda-importe-egreso" : undefined} />
            {c.id === "importe" && <p id="ayuda-importe-egreso" className="text-xs text-muted-foreground">Mayor que cero. Hasta dos decimales, con punto: 1250.50.</p>}
            {errores[c.id] && <p id={`error-egreso-${c.id}`} className="text-sm text-destructive">{errores[c.id]}</p>}</div>)}
          <div className="space-y-2"><Label htmlFor="egreso-nota">Observación (opcional)</Label><Textarea id="egreso-nota" name="nota" aria-invalid={!!errores.nota} aria-describedby={errores.nota ? "error-egreso-nota" : undefined} />{errores.nota && <p id="error-egreso-nota" className="text-sm text-destructive">{errores.nota}</p>}</div>
        </fieldset>
        {resultado && resultado.estado !== "ok" && resultado.estado !== "datos_invalidos" && <div role="alert" className="text-sm text-destructive">
          {resultado.estado === "error_tecnico" ? "No pudimos registrar el egreso. Conservamos tus datos para reintentar." : resultado.estado === "conflicto_solicitud" ? "Esta solicitud ya se usó con otros datos. Cerrá y volvé a abrir el formulario." : <>Tu sesión venció. <Link className="underline" href="/admin/login">Iniciar sesión</Link></>}
        </div>}
        {errores.claveSolicitud && <p role="alert" className="text-sm text-destructive">{errores.claveSolicitud}</p>}
        <div className="flex flex-wrap justify-end gap-3"><Button type="button" variant="outline" disabled={enviando} onClick={() => cambiar(false)}>Cancelar</Button><PendingButton type="submit" pending={enviando} pendingLabel="Guardando…">Guardar egreso</PendingButton></div>
      </form>
    </DialogContent>
  </Dialog>
}
