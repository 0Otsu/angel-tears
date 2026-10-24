"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/lib/infraestructura/auth-cliente"
import { solicitarRecuperacion, type ClienteRecuperacion } from "@/lib/modulos/autenticacion/recuperar-contrasena"

// Pedido del enlace de recuperacion (tarea 3.1). La respuesta es SIEMPRE la misma, exista o no la
// cuenta y llegue o no el correo: este texto no puede revelar nada. Lo unico distinto es un correo
// mal escrito (formato) y el limite de intentos, que no dependen de la cuenta.
const cliente: ClienteRecuperacion = authClient

const MENSAJE_NEUTRO =
  "Si el correo corresponde a la cuenta, te enviamos un enlace para elegir una contraseña nueva. Sirve una sola vez y vence en 1 hora. Revisá también la carpeta de spam."
const MENSAJE_LIMITE = "Hiciste demasiados pedidos. Esperá unos minutos y volvé a probar."

export function FormularioRecuperar() {
  const [errorEmail, setErrorEmail] = useState<string | null>(null)
  const [aviso, setAviso] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enviando) return
    // Se guarda el formulario ahora: despues de un `await` React ya dejo `currentTarget` en null.
    const formulario = evento.currentTarget
    const email = String(new FormData(formulario).get("email") ?? "")

    setErrorEmail(null)
    setAviso(null)
    setEnviando(true)
    try {
      const resultado = await solicitarRecuperacion(cliente, email)
      if (resultado.estado === "email_invalido") {
        setErrorEmail(resultado.mensaje)
        ;(formulario.elements.namedItem("email") as HTMLElement | null)?.focus()
      } else if (resultado.estado === "demasiados_intentos") {
        setAviso({ tipo: "error", texto: MENSAJE_LIMITE })
      } else {
        setAviso({ tipo: "exito", texto: MENSAJE_NEUTRO })
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={alEnviar} noValidate className="space-y-5" aria-label="Recuperar contraseña">
        <div className="space-y-2.5">
          <Label htmlFor="email" className="text-sm font-medium text-foreground">
            Correo electrónico
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            aria-required="true"
            aria-invalid={errorEmail ? true : undefined}
            aria-describedby={errorEmail ? "error-email" : undefined}
            placeholder="Tu correo"
            className="h-12 rounded-xl border-border bg-background px-4 text-base shadow-none focus-visible:ring-2 focus-visible:ring-primary/20 md:text-base"
          />
          {errorEmail && (
            <p id="error-email" className="text-sm text-destructive">
              {errorEmail}
            </p>
          )}
        </div>

        {aviso && (
          <p
            role={aviso.tipo === "exito" ? "status" : "alert"}
            className={
              aviso.tipo === "exito"
                ? "rounded-xl bg-primary/10 px-4 py-3 text-sm leading-relaxed text-primary"
                : "rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
            }
          >
            {aviso.texto}
          </p>
        )}

        <Button
          type="submit"
          disabled={enviando}
          aria-busy={enviando}
          className="mt-2 h-13 w-full rounded-full px-8 text-sm font-normal tracking-wide boty-shadow boty-transition focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {enviando ? "Enviando…" : "Enviarme el enlace"}
        </Button>
      </form>

      <p className="text-sm">
        <Link
          href="/admin/login"
          className="rounded-sm text-muted-foreground underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Volver al inicio de sesión
        </Link>
      </p>
    </div>
  )
}
