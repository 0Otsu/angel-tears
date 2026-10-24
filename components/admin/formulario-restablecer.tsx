"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/lib/infraestructura/auth-cliente"
import {
  restablecerContrasena,
  type ClienteRecuperacion,
  type ErroresRestablecer,
} from "@/lib/modulos/autenticacion/recuperar-contrasena"

// Elegir la contrasena nueva con el enlace del correo (tarea 3.2). Al terminar NO se inicia
// sesion: se cierran todas las sesiones y hay que ingresar con la contrasena nueva. El token
// viaja solo en el pedido; nunca se muestra, ni se escribe en logs o almacenamiento del cliente.
const cliente: ClienteRecuperacion = authClient

const MENSAJE_LIMITE = "Hiciste demasiados intentos. Esperá unos minutos y volvé a probar."
const MENSAJE_TECNICO = "No pudimos completar la operación por un problema técnico. Probá de nuevo en unos minutos."

const claseLink =
  "rounded-sm text-muted-foreground underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
const claseCampo =
  "h-12 rounded-xl border-border bg-background px-4 text-base shadow-none focus-visible:ring-2 focus-visible:ring-primary/20 md:text-base"

function EnlaceInvalido() {
  return (
    <div className="space-y-5">
      <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm leading-relaxed text-destructive">
        El enlace no es válido o ya venció. Pedí uno nuevo para elegir tu contraseña.
      </p>
      <p className="text-sm">
        <Link href="/admin/recuperar" className={claseLink}>
          Pedir un enlace nuevo
        </Link>
      </p>
    </div>
  )
}

export function FormularioRestablecer({ token, enlaceInvalido }: { token?: string; enlaceInvalido: boolean }) {
  const [errores, setErrores] = useState<ErroresRestablecer>({})
  const [aviso, setAviso] = useState<string | null>(null)
  const [invalido, setInvalido] = useState(enlaceInvalido || !token)
  const [terminado, setTerminado] = useState(false)
  const [enviando, setEnviando] = useState(false)

  if (invalido) return <EnlaceInvalido />

  if (terminado) {
    return (
      <div className="space-y-5">
        <p role="status" className="rounded-xl bg-primary/10 px-4 py-3 text-sm leading-relaxed text-primary">
          Listo: cambiaste tu contraseña. Por seguridad cerramos todas tus sesiones; ingresá con la nueva.
        </p>
        <Button asChild className="h-13 w-full rounded-full px-8 text-sm font-normal tracking-wide">
          <Link href="/admin/login">Ir a iniciar sesión</Link>
        </Button>
      </div>
    )
  }

  function vaciar(formulario: HTMLFormElement) {
    for (const campo of ["contrasenaNueva", "confirmacion"]) {
      const elemento = formulario.elements.namedItem(campo) as HTMLInputElement | null
      if (elemento) elemento.value = ""
    }
  }

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enviando) return
    const formulario = evento.currentTarget
    const datos = new FormData(formulario)

    setErrores({})
    setAviso(null)
    setEnviando(true)
    try {
      const resultado = await restablecerContrasena(cliente, {
        token,
        contrasenaNueva: String(datos.get("contrasenaNueva") ?? ""),
        confirmacion: String(datos.get("confirmacion") ?? ""),
      })
      switch (resultado.estado) {
        case "ok":
          vaciar(formulario)
          setTerminado(true)
          return
        case "enlace_invalido":
          vaciar(formulario)
          setInvalido(true)
          return
        case "datos_invalidos": {
          // El enlace sigue vigente: se corrige y se vuelve a enviar con el mismo enlace.
          setErrores(resultado.errores)
          const primero = resultado.errores.contrasenaNueva ? "contrasenaNueva" : "confirmacion"
          ;(formulario.elements.namedItem(primero) as HTMLElement | null)?.focus()
          return
        }
        case "demasiados_intentos":
          vaciar(formulario)
          setAviso(MENSAJE_LIMITE)
          return
        default:
          vaciar(formulario)
          setAviso(MENSAJE_TECNICO)
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={alEnviar} noValidate className="space-y-5" aria-label="Elegir contraseña nueva">
      <div className="space-y-2.5">
        <Label htmlFor="contrasenaNueva" className="text-sm font-medium text-foreground">
          Contraseña nueva
        </Label>
        <Input
          id="contrasenaNueva"
          name="contrasenaNueva"
          type="password"
          autoComplete="new-password"
          required
          aria-required="true"
          aria-invalid={errores.contrasenaNueva ? true : undefined}
          aria-describedby={errores.contrasenaNueva ? "error-contrasenaNueva ayuda-contrasenaNueva" : "ayuda-contrasenaNueva"}
          className={claseCampo}
        />
        <p id="ayuda-contrasenaNueva" className="text-xs text-muted-foreground">
          Entre 8 y 128 caracteres.
        </p>
        {errores.contrasenaNueva && (
          <p id="error-contrasenaNueva" className="text-sm text-destructive">
            {errores.contrasenaNueva}
          </p>
        )}
      </div>

      <div className="space-y-2.5">
        <Label htmlFor="confirmacion" className="text-sm font-medium text-foreground">
          Repetir contraseña nueva
        </Label>
        <Input
          id="confirmacion"
          name="confirmacion"
          type="password"
          autoComplete="new-password"
          required
          aria-required="true"
          aria-invalid={errores.confirmacion ? true : undefined}
          aria-describedby={errores.confirmacion ? "error-confirmacion" : undefined}
          className={claseCampo}
        />
        {errores.confirmacion && (
          <p id="error-confirmacion" className="text-sm text-destructive">
            {errores.confirmacion}
          </p>
        )}
      </div>

      {aviso && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {aviso}
        </p>
      )}

      <Button
        type="submit"
        disabled={enviando}
        aria-busy={enviando}
        className="mt-2 h-13 w-full rounded-full px-8 text-sm font-normal tracking-wide boty-shadow boty-transition focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {enviando ? "Guardando…" : "Cambiar contraseña"}
      </Button>
    </form>
  )
}
