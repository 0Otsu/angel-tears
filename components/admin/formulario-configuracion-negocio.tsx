"use client"

import { startTransition, useActionState, useState, type FormEvent } from "react"
import Link from "next/link"
import { guardarConfiguracionAccion } from "@/app/admin/(panel)/configuracion/acciones"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PendingButton } from "@/components/ui/pending-button"
import { HorariosConfiguracion } from "./horarios-configuracion"
import { DIAS_SEMANA, type ConfiguracionNegocio, type DiaAtencion } from "@/lib/modulos/configuracion/contrato"
import { esquemaFranjasDia } from "@/lib/modulos/configuracion/validacion"
import { PanelAdmin, TituloPanel } from "./piezas-admin"

const campos: Record<keyof Omit<ConfiguracionNegocio, "horarios">, { etiqueta: string; tipo?: string }> = {
  direccion: { etiqueta: "Calle y número" },
  localidad: { etiqueta: "Localidad" },
  provincia: { etiqueta: "Provincia" },
  referencia: { etiqueta: "Referencia (opcional)" },
  comoLlegar: { etiqueta: "Enlace de Google Maps", tipo: "url" },
  telefonoWhatsApp: { etiqueta: "WhatsApp (con código de país)", tipo: "tel" },
  usuarioInstagram: { etiqueta: "Usuario o enlace de Instagram" },
}

export function FormularioConfiguracionNegocio({ inicial }: { inicial: ConfiguracionNegocio }) {
  const [datos, setDatos] = useState({ ...inicial, telefonoWhatsApp: `+${inicial.telefonoWhatsApp}`, usuarioInstagram: `@${inicial.usuarioInstagram}` })
  const [diaEnEdicion, editarDia] = useState<DiaAtencion | null>(null)
  const [mostrarErroresHorarios, mostrarErrores] = useState(false)
  const [estado, guardar, pendiente] = useActionState(guardarConfiguracionAccion, null)
  const errores = estado?.estado === "datos_invalidos" ? estado.errores : {}

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (pendiente) return
    const invalido = DIAS_SEMANA.find(dia => !esquemaFranjasDia.safeParse(datos.horarios[dia]).success)
    if (invalido) {
      mostrarErrores(true)
      editarDia(invalido)
      return
    }
    mostrarErrores(false)
    const formulario = new FormData(evento.currentTarget)
    formulario.set("horarios", JSON.stringify(datos.horarios))
    startTransition(() => guardar(formulario))
  }

  function campo(nombre: keyof typeof campos) {
    const { etiqueta, tipo } = campos[nombre]
    const error = errores[nombre]?.[0]
    const id = `negocio-${nombre}`
    const accesibilidad = { "aria-invalid": Boolean(error), "aria-describedby": error ? `${id}-error` : undefined }
    const cambiar = (valor: string) => setDatos(datos => ({ ...datos, [nombre]: valor }))

    return <div className="min-w-0 space-y-2">
      <Label htmlFor={id}>{etiqueta}</Label>
      <Input id={id} name={nombre} type={tipo} value={datos[nombre]}
        onChange={(e) => cambiar(e.target.value)} {...accesibilidad} />
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
        <HorariosConfiguracion horarios={datos.horarios} inicial={inicial.horarios}
          diaEnEdicion={diaEnEdicion} editar={editarDia}
          cambiar={horarios => setDatos(previos => ({ ...previos, horarios }))}
          mostrarErrores={mostrarErroresHorarios} errorServidor={errores.horarios?.[0]} />
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
    {estado?.estado === "ok" && !mostrarErroresHorarios && <p role="status" className="text-sm text-success">Configuración guardada.</p>}
    {estado?.estado === "datos_invalidos" && <p role="alert" className="text-sm text-destructive">Revisá los campos e intentá nuevamente.</p>}
    {estado?.estado === "sesion_requerida" && <p role="alert" className="text-sm text-destructive">Tu sesión venció. <Link className="underline" href="/admin/login">Volvé a iniciar sesión</Link>.</p>}
    {estado?.estado === "error_tecnico" && <p role="alert" className="text-sm text-destructive">No pudimos guardar la configuración. Conservamos tus datos.</p>}
  </form>
}
