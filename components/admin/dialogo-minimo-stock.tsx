"use client"
import { useRef, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { cambiarMinimoAccion } from "@/app/admin/(panel)/stock/acciones"
import type { FilaStock, ResultadoMinimoAdmin } from "@/lib/modulos/inventario/administracion-contrato"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PendingButton } from "@/components/ui/pending-button"

function mensaje(r: ResultadoMinimoAdmin | null) {
  switch (r?.estado) {
    case "no_encontrado": return "El producto ya no tiene inventario. Recargá la página."
    case "sesion_requerida": return "Tu sesión venció. Volvé a iniciar sesión."
    case "error_tecnico": return "No pudimos guardar el mínimo. Intentá nuevamente."
    default: return null
  }
}

export function DialogoMinimoStock({ fila, alGuardar }: { fila: FilaStock; alGuardar: (texto: string) => void }) {
  const [abierto, abrir] = useState(false)
  const [minimo, setMinimo] = useState("")
  const [resultado, setResultado] = useState<ResultadoMinimoAdmin | null>(null)
  const [enviando, ocupar] = useState(false)
  const enCurso = useRef(false)
  const router = useRouter()
  const error = resultado?.estado === "datos_invalidos" ? resultado.errores.minimo : null

  function cambiarApertura(valor: boolean) {
    if (enviando) return
    abrir(valor)
    if (valor) { setMinimo(fila.minimo === null ? "" : String(fila.minimo)); setResultado(null) }
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enCurso.current) return
    enCurso.current = true; ocupar(true)
    try {
      let respuesta: ResultadoMinimoAdmin
      try { respuesta = await cambiarMinimoAccion({ productoId: fila.productoId, minimo }) }
      catch { respuesta = { estado: "error_tecnico" } }
      setResultado(respuesta)
      if (respuesta.estado === "ok") {
        abrir(false)
        alGuardar(respuesta.minimo === null ? `Se quitó el mínimo de ${fila.nombre}.` : `Mínimo de ${fila.nombre}: ${respuesta.minimo}.`)
        router.refresh()
      }
    } finally { enCurso.current = false; ocupar(false) }
  }

  const general = mensaje(resultado)
  return <Dialog open={abierto} onOpenChange={cambiarApertura}>
    <DialogTrigger asChild><Button variant="outline" className="min-h-11" aria-label={`Configurar mínimo de ${fila.nombre}`}>Mínimo</Button></DialogTrigger>
    <DialogContent>
      <DialogHeader><DialogTitle>Mínimo de stock</DialogTitle><DialogDescription>{fila.nombre}. Hay stock bajo cuando el stock es igual o menor al mínimo. Dejalo vacío para no avisar; cero es un mínimo válido.</DialogDescription></DialogHeader>
      <form onSubmit={enviar} noValidate aria-label="Mínimo de stock" className="space-y-4">
        <fieldset disabled={enviando} className="space-y-2">
          <Label htmlFor={`minimo-${fila.productoId}`}>Mínimo</Label>
          <Input id={`minimo-${fila.productoId}`} name="minimo" inputMode="numeric" value={minimo} onChange={e => setMinimo(e.target.value)} placeholder="Sin mínimo" aria-invalid={Boolean(error)} aria-describedby={error ? `error-minimo-${fila.productoId}` : undefined} className="min-h-11" />
          {error && <p id={`error-minimo-${fila.productoId}`} className="text-sm text-destructive">{error}</p>}
        </fieldset>
        {general && <div role="alert" className="space-y-2 text-sm text-destructive"><p>{general}</p>{resultado?.estado === "sesion_requerida" && <Link href="/admin/login" className="underline">Iniciar sesión</Link>}</div>}
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="outline" className="min-h-11" disabled={enviando} onClick={() => cambiarApertura(false)}>Cancelar</Button>
          <PendingButton className="min-h-11" type="submit" pending={enviando} pendingLabel="Guardando…">Guardar mínimo</PendingButton>
        </div>
      </form>
    </DialogContent>
  </Dialog>
}
