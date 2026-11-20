"use client"

import { startTransition, useActionState, useState, type FormEvent } from "react"
import Link from "next/link"
import { guardarConfiguracionAccion } from "@/app/admin/(panel)/configuracion/acciones"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PendingButton } from "@/components/ui/pending-button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DIAS_SEMANA, type ConfiguracionNegocio } from "@/lib/modulos/configuracion/contrato"
import { NOMBRES_DIAS } from "@/lib/negocio-publico"
import { PanelAdmin, TituloPanel } from "./piezas-admin"

const campos: Record<keyof Omit<ConfiguracionNegocio, "diasAtencion">, { etiqueta: string; tipo?: string }> = {
  direccion: { etiqueta: "Calle y número" },
  localidad: { etiqueta: "Localidad" },
  provincia: { etiqueta: "Provincia" },
  referencia: { etiqueta: "Referencia (opcional)" },
  comoLlegar: { etiqueta: "Enlace de Google Maps", tipo: "url" },
  apertura: { etiqueta: "Apertura" },
  cierre: { etiqueta: "Cierre" },
  telefonoWhatsApp: { etiqueta: "WhatsApp (con código de país)", tipo: "tel" },
  usuarioInstagram: { etiqueta: "Usuario o enlace de Instagram" },
}

const horas = Array.from({ length: 96 }, (_, indice) =>
  `${String(Math.floor(indice / 4)).padStart(2, "0")}:${String((indice % 4) * 15).padStart(2, "0")}`,
)

export function FormularioConfiguracionNegocio({ inicial }: { inicial: ConfiguracionNegocio }) {
  const [datos, setDatos] = useState({ ...inicial, telefonoWhatsApp: `+${inicial.telefonoWhatsApp}`, usuarioInstagram: `@${inicial.usuarioInstagram}` })
  const [estado, guardar, pendiente] = useActionState(guardarConfiguracionAccion, null)
  const errores = estado?.estado === "datos_invalidos" ? estado.errores : {}

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (pendiente) return
    const formulario = new FormData(evento.currentTarget)
    startTransition(() => guardar(formulario))
  }

  function campo(nombre: keyof typeof campos) {
    const { etiqueta, tipo } = campos[nombre]
    const error = errores[nombre]?.[0]
    const id = `negocio-${nombre}`
    const accesibilidad = { "aria-invalid": Boolean(error), "aria-describedby": error ? `${id}-error` : undefined }
    const esHorario = nombre === "apertura" || nombre === "cierre"
    const opciones = esHorario ? [...new Set([...horas, inicial[nombre], datos[nombre]])].sort() : []
    const cambiar = (valor: string) => setDatos(datos => ({ ...datos, [nombre]: valor }))

    return <div className="min-w-0 space-y-2">
      <Label htmlFor={id}>{etiqueta}</Label>
      {esHorario ? <Select name={nombre} value={datos[nombre]} onValueChange={cambiar} disabled={pendiente}>
        <SelectTrigger id={id} className="w-full data-[size=default]:h-11" {...accesibilidad}><SelectValue /></SelectTrigger>
        <SelectContent align="start" collisionPadding={8}
          className="max-h-[min(18rem,var(--radix-select-content-available-height))] [&_[data-radix-select-viewport]]:h-auto">
          {opciones.map(hora => <SelectItem key={hora} value={hora} className="min-h-11">{hora}</SelectItem>)}
        </SelectContent>
      </Select> : <Input id={id} name={nombre} type={tipo} value={datos[nombre]}
        onChange={(e) => cambiar(e.target.value)} {...accesibilidad} />}
      {error && <p id={`${id}-error`} className="text-sm text-destructive">{error}</p>}
    </div>
  }

  return <form onSubmit={enviar} noValidate aria-label="Configuración del negocio" className="space-y-5">
    <PanelAdmin>
      <TituloPanel titulo="Información del local" />
      <fieldset disabled={pendiente} aria-label="Dirección y horarios" className="min-w-0 space-y-5 px-5 pb-6 lg:px-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {campo("direccion")}
          {campo("referencia")}
          {campo("localidad")}
          {campo("provincia")}
        </div>
        {campo("comoLlegar")}
        <fieldset aria-describedby={errores.diasAtencion ? "negocio-dias-error" : undefined} className="space-y-2">
          <legend className="text-sm font-medium">Días de atención</legend>
          <div className="flex flex-wrap gap-2">
            {DIAS_SEMANA.map((dia) => <label key={dia} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border px-3 text-sm">
              <input name="diasAtencion" type="checkbox" value={dia} checked={datos.diasAtencion.includes(dia)}
                onChange={(e) => setDatos({ ...datos, diasAtencion: e.target.checked ? [...datos.diasAtencion, dia] : datos.diasAtencion.filter((valor) => valor !== dia) })} />
              {NOMBRES_DIAS[dia]}
            </label>)}
          </div>
          {errores.diasAtencion && <p id="negocio-dias-error" className="text-sm text-destructive">{errores.diasAtencion[0]}</p>}
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          {campo("apertura")}
          {campo("cierre")}
        </div>
      </fieldset>
    </PanelAdmin>
    <PanelAdmin>
      <TituloPanel titulo="Información de contacto" />
      <fieldset disabled={pendiente} aria-label="Canales de contacto" className="grid gap-4 px-5 pb-6 sm:grid-cols-2 lg:px-6">
        {campo("telefonoWhatsApp")}
        {campo("usuarioInstagram")}
      </fieldset>
    </PanelAdmin>
    <PendingButton type="submit" pending={pendiente} pendingLabel="Guardando…" className="min-h-11">Guardar cambios</PendingButton>
    {estado?.estado === "ok" && <p role="status" className="text-sm text-success">Configuración guardada.</p>}
    {estado?.estado === "datos_invalidos" && <p role="alert" className="text-sm text-destructive">Revisá los campos e intentá nuevamente.</p>}
    {estado?.estado === "sesion_requerida" && <p role="alert" className="text-sm text-destructive">Tu sesión venció. <Link className="underline" href="/admin/login">Volvé a iniciar sesión</Link>.</p>}
    {estado?.estado === "error_tecnico" && <p role="alert" className="text-sm text-destructive">No pudimos guardar la configuración. Conservamos tus datos.</p>}
  </form>
}
