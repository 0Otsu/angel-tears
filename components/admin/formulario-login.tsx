"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/lib/infraestructura/auth-cliente"

// Login de la Administradora (tarea 2.3). La validacion de aca solo orienta: el servidor
// (Better Auth) valida otra vez y decide. Los mensajes siguen la matriz de errores del change:
// credenciales incorrectas siempre con el mismo texto neutro (no revela si el correo existe),
// y nunca se muestra detalle tecnico, SQL, trazas, tokens ni secretos.
const esquema = z.object({
  email: z.email({ error: "Ingresá un correo válido." }),
  contrasena: z.string().min(1, { error: "Ingresá tu contraseña." }),
})

type Errores = { email?: string; contrasena?: string; general?: string }

const MENSAJE_CREDENCIALES = "El correo o la contraseña no son correctos."
const MENSAJE_LIMITE = "Hiciste demasiados intentos. Esperá unos minutos y volvé a probar."
const MENSAJE_TECNICO =
  "No pudimos iniciar sesión por un problema técnico. Probá de nuevo en unos minutos."

function mensajeDeError(error: { status?: number; code?: string }): string {
  if (error.status === 429) return MENSAJE_LIMITE
  if (error.status === 401 || error.code === "INVALID_EMAIL_OR_PASSWORD") return MENSAJE_CREDENCIALES
  if (error.status === 400) return "Revisá el correo y la contraseña."
  return MENSAJE_TECNICO
}

export function FormularioLogin() {
  const router = useRouter()
  const [errores, setErrores] = useState<Errores>({})
  const [enviando, setEnviando] = useState(false)

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enviando) return
    const formulario = evento.currentTarget
    const datos = new FormData(formulario)
    const email = String(datos.get("email") ?? "").trim()
    const contrasena = String(datos.get("contrasena") ?? "")

    const validacion = esquema.safeParse({ email, contrasena })
    if (!validacion.success) {
      const nuevos: Errores = {}
      for (const problema of validacion.error.issues) {
        const campo = problema.path[0]
        if (campo === "email" || campo === "contrasena") nuevos[campo] ??= problema.message
      }
      setErrores(nuevos)
      const primero = nuevos.email ? "email" : "contrasena"
      ;(formulario.elements.namedItem(primero) as HTMLElement | null)?.focus()
      return
    }

    setErrores({})
    setEnviando(true)
    try {
      const { error } = await authClient.signIn.email({ email, password: contrasena })
      if (error) {
        fallar(formulario, mensajeDeError(error))
        return
      }
      router.push("/admin")
      router.refresh()
    } catch {
      fallar(formulario, MENSAJE_TECNICO)
    } finally {
      setEnviando(false)
    }
  }

  // Conserva el correo (dato no sensible), borra la contrasena y devuelve el foco a ese campo.
  function fallar(formulario: HTMLFormElement, mensaje: string) {
    setErrores({ general: mensaje })
    const campo = formulario.elements.namedItem("contrasena") as HTMLInputElement | null
    if (campo) {
      campo.value = ""
      campo.focus()
    }
  }

  return (
    <form
      onSubmit={alEnviar}
      noValidate
      className="space-y-5"
      aria-label="Acceso administrativo"
    >
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
          aria-invalid={errores.email ? true : undefined}
          aria-describedby={errores.email ? "error-email" : undefined}
          placeholder="Tu correo"
          className="h-12 rounded-xl border-border bg-background px-4 text-base shadow-none focus-visible:ring-2 focus-visible:ring-primary/20 md:text-base"
        />
        {errores.email && (
          <p id="error-email" className="text-sm text-destructive">
            {errores.email}
          </p>
        )}
      </div>

      <div className="space-y-2.5">
        <Label htmlFor="contrasena" className="text-sm font-medium text-foreground">
          Contraseña
        </Label>
        <Input
          id="contrasena"
          name="contrasena"
          type="password"
          autoComplete="current-password"
          required
          aria-required="true"
          aria-invalid={errores.contrasena ? true : undefined}
          aria-describedby={errores.contrasena ? "error-contrasena" : undefined}
          placeholder="Tu contraseña"
          className="h-12 rounded-xl border-border bg-background px-4 text-base shadow-none focus-visible:ring-2 focus-visible:ring-primary/20 md:text-base"
        />
        {errores.contrasena && (
          <p id="error-contrasena" className="text-sm text-destructive">
            {errores.contrasena}
          </p>
        )}
      </div>

      {errores.general && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errores.general}
        </p>
      )}

      <Button
        type="submit"
        disabled={enviando}
        aria-busy={enviando}
        className="group mt-2 h-13 w-full rounded-full px-8 text-sm font-normal tracking-wide boty-shadow boty-transition focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {enviando ? "Ingresando…" : "Ingresar"}
        {!enviando && (
          <ArrowRight className="size-4 boty-transition group-hover:translate-x-1" aria-hidden="true" />
        )}
      </Button>
    </form>
  )
}
