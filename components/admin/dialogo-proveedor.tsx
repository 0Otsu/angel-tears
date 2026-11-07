"use client"
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { crearProveedorAccion, modificarProveedorAccion } from "@/app/admin/(panel)/proveedores/acciones"
import type { ProveedorAdministrativo, ResultadoProveedorAdmin } from "@/lib/modulos/proveedores/administracion-contrato"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PendingButton } from "@/components/ui/pending-button"
import { Textarea } from "@/components/ui/textarea"

const CAMPOS = [
  { nombre: "nombre", etiqueta: "Nombre", requerido: true, ejemplo: "Ej: Distribuidora Luna" },
  { nombre: "telefono", etiqueta: "Teléfono", ejemplo: "Ej: 11 5555-1234" },
  { nombre: "instagram", etiqueta: "Instagram", ejemplo: "Ej: @distribuidoraluna" },
  { nombre: "nota", etiqueta: "Notas", ejemplo: "Ej: Entrega en 48 horas" },
] as const
type Valores = Record<(typeof CAMPOS)[number]["nombre"], string>

const vacios: Valores = { nombre: "", telefono: "", instagram: "", nota: "" }
const valoresDe = (p?: ProveedorAdministrativo): Valores =>
  p ? { nombre: p.nombre, telefono: p.telefono ?? "", instagram: p.instagram ?? "", nota: p.nota ?? "" } : vacios

function mensaje(r: ResultadoProveedorAdmin | null) {
  switch (r?.estado) {
    case "conflicto_version": return "El proveedor cambió desde que lo abriste. Recargá los datos para no pisar esa edición."
    case "no_encontrado": return "El proveedor ya no está disponible. Recargá el listado."
    case "sesion_requerida": return "Tu sesión venció. Volvé a iniciar sesión antes de guardar."
    case "error_tecnico": return "No pudimos guardar el proveedor. Conservamos tus datos para que puedas reintentar."
    default: return null
  }
}

export function DialogoProveedor({ proveedor, alGuardar, children }: { proveedor?: ProveedorAdministrativo; alGuardar: (texto: string) => void; children: ReactNode }) {
  const [abierto, abrir] = useState(false)
  const [valores, setValores] = useState<Valores>(() => valoresDe(proveedor))
  const [resultado, setResultado] = useState<ResultadoProveedorAdmin | null>(null)
  const [enviando, ocupar] = useState(false)
  const enCurso = useRef(false)
  const formulario = useRef<HTMLFormElement>(null)
  const router = useRouter()
  const errores = resultado?.estado === "datos_invalidos" ? resultado.errores : {}

  useEffect(() => {
    if (!enviando && resultado?.estado === "datos_invalidos") {
      const campo = formulario.current?.elements.namedItem(Object.keys(resultado.errores)[0])
      if (campo instanceof HTMLElement) campo.focus()
    }
  }, [enviando, resultado])

  function cambiarApertura(valor: boolean) {
    if (enviando) return
    abrir(valor)
    if (valor) { setValores(valoresDe(proveedor)); setResultado(null) }
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enCurso.current) return
    enCurso.current = true; ocupar(true)
    try {
      let respuesta: ResultadoProveedorAdmin
      try {
        respuesta = await (proveedor
          ? modificarProveedorAccion({ id: proveedor.id, version: proveedor.version }, valores)
          : crearProveedorAccion(valores))
      } catch { respuesta = { estado: "error_tecnico" } }
      setResultado(respuesta)
      if (respuesta.estado === "ok") {
        abrir(false)
        alGuardar(proveedor ? `Proveedor ${respuesta.proveedor.nombre} actualizado.` : `Proveedor ${respuesta.proveedor.nombre} creado.`)
        router.refresh()
      }
    } finally { enCurso.current = false; ocupar(false) }
  }

  const general = mensaje(resultado)
  const conflicto = resultado?.estado === "conflicto_version" || resultado?.estado === "no_encontrado"
  const id = proveedor?.id ?? "nuevo"
  return <Dialog open={abierto} onOpenChange={cambiarApertura}>
    <DialogTrigger asChild>{children}</DialogTrigger>
    <DialogContent>
      <DialogHeader><DialogTitle>{proveedor ? "Editar proveedor" : "Nuevo proveedor"}</DialogTitle><DialogDescription>Solo el nombre es obligatorio. Las compras ya registradas conservan el nombre con el que se cargaron.</DialogDescription></DialogHeader>
      <form ref={formulario} onSubmit={enviar} noValidate aria-label={proveedor ? "Editar proveedor" : "Nuevo proveedor"} className="space-y-4">
        <fieldset disabled={enviando} className="space-y-4">
          {CAMPOS.map((campo) => {
            const requerido = "requerido" in campo && campo.requerido
            const Control = campo.nombre === "nota" ? Textarea : Input
            return <div key={campo.nombre} className="space-y-2">
              <Label htmlFor={`proveedor-${campo.nombre}-${id}`}>{campo.etiqueta}{requerido ? " *" : ""}</Label>
              <Control id={`proveedor-${campo.nombre}-${id}`} name={campo.nombre} value={valores[campo.nombre]} placeholder={campo.ejemplo}
                onChange={(e) => setValores({ ...valores, [campo.nombre]: e.target.value })}
                required={requerido} aria-invalid={Boolean(errores[campo.nombre])}
                aria-describedby={errores[campo.nombre] ? `error-${campo.nombre}-${id}` : undefined}
                className={Control === Input ? "min-h-11" : undefined} />
              {errores[campo.nombre] && <p id={`error-${campo.nombre}-${id}`} className="text-sm text-destructive">{errores[campo.nombre]}</p>}
            </div>
          })}
        </fieldset>
        {general && <div role="alert" className="space-y-2 text-sm text-destructive"><p>{general}</p>
          {resultado?.estado === "sesion_requerida" && <Link href="/admin/login" className="underline">Iniciar sesión</Link>}
          {conflicto && <Button type="button" variant="outline" onClick={() => { abrir(false); router.refresh() }}>Recargar datos</Button>}
        </div>}
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="outline" className="min-h-11" disabled={enviando} onClick={() => cambiarApertura(false)}>Cancelar</Button>
          <PendingButton className="min-h-11" type="submit" pending={enviando} pendingLabel="Guardando…">{proveedor ? "Guardar cambios" : "Crear proveedor"}</PendingButton>
        </div>
      </form>
    </DialogContent>
  </Dialog>
}
