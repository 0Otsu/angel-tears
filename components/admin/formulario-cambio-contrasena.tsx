"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/lib/infraestructura/auth-cliente"
import {
  cambiarContrasena,
  cerrarOtrasSesiones,
  type CampoCambioContrasena,
  type ClienteCambioContrasena,
  type ErroresCambioContrasena,
} from "@/lib/modulos/autenticacion/cambiar-contrasena"

// Cambio de contrasena de la Administradora autenticada (tarea 3.5). Pide la contrasena actual;
// al terminar conserva esta sesion e invalida las demas (decision del 21/10/2026). Las
// contrasenas nunca se guardan: en memoria solo mientras se escribe, y se borran ante cualquier
// error del servidor y al terminar. Los mensajes no revelan detalles tecnicos.
const cliente: ClienteCambioContrasena = authClient

const MENSAJE_LIMITE = "Hiciste demasiados intentos. Esperá unos minutos y volvé a probar."
const MENSAJE_TECNICO = "No pudimos completar la operación por un problema técnico. Probá de nuevo en unos minutos."

type Aviso = { tipo: "exito" | "error" | "advertencia"; texto: string }

const CAMPOS: CampoCambioContrasena[] = ["contrasenaActual", "contrasenaNueva", "confirmacion"]

const claseCampo =
  "h-12 rounded-xl border-border bg-background px-4 text-base shadow-none focus-visible:ring-2 focus-visible:ring-primary/20 md:text-base"

export function FormularioCambioContrasena() {
  const router = useRouter()
  const [errores, setErrores] = useState<ErroresCambioContrasena>({})
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const [pendienteCerrarOtras, setPendienteCerrarOtras] = useState(false)
  const [enviando, setEnviando] = useState(false)

  function vaciar(formulario: HTMLFormElement) {
    for (const campo of CAMPOS) {
      const elemento = formulario.elements.namedItem(campo) as HTMLInputElement | null
      if (elemento) elemento.value = ""
    }
  }

  function volverAlLogin() {
    router.push("/admin/login")
    router.refresh()
  }

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enviando) return
    const formulario = evento.currentTarget
    const datos = new FormData(formulario)
    const valores = {
      contrasenaActual: String(datos.get("contrasenaActual") ?? ""),
      contrasenaNueva: String(datos.get("contrasenaNueva") ?? ""),
      confirmacion: String(datos.get("confirmacion") ?? ""),
    }

    setErrores({})
    setAviso(null)
    setPendienteCerrarOtras(false)
    setEnviando(true)
    try {
      const resultado = await cambiarContrasena(cliente, valores)
      switch (resultado.estado) {
        case "datos_invalidos": {
          // Error de formato: no se envio nada, se conservan los campos para corregirlos.
          setErrores(resultado.errores)
          const primero = CAMPOS.find((campo) => resultado.errores[campo])
          ;(formulario.elements.namedItem(primero ?? "contrasenaActual") as HTMLElement | null)?.focus()
          return
        }
        case "ok":
          vaciar(formulario)
          setAviso({ tipo: "exito", texto: "Listo: cambiaste tu contraseña y cerramos tus otras sesiones. Esta sesión sigue abierta." })
          return
        case "cambiada_sin_cerrar_otras":
          vaciar(formulario)
          setPendienteCerrarOtras(true)
          setAviso({
            tipo: "advertencia",
            texto: "Cambiaste tu contraseña, pero no pudimos cerrar tus otras sesiones. Intentá cerrarlas de nuevo.",
          })
          return
        case "sesion_vencida":
          vaciar(formulario)
          volverAlLogin()
          return
        case "contrasena_actual_incorrecta":
          vaciar(formulario)
          setErrores({ contrasenaActual: "La contraseña actual no es correcta." })
          ;(formulario.elements.namedItem("contrasenaActual") as HTMLElement | null)?.focus()
          return
        case "demasiados_intentos":
          vaciar(formulario)
          setAviso({ tipo: "error", texto: MENSAJE_LIMITE })
          return
        default:
          vaciar(formulario)
          setAviso({ tipo: "error", texto: MENSAJE_TECNICO })
      }
    } finally {
      setEnviando(false)
    }
  }

  async function reintentarCierre() {
    if (enviando) return
    setEnviando(true)
    setAviso(null)
    try {
      const resultado = await cerrarOtrasSesiones(cliente)
      if (resultado.estado === "ok") {
        setPendienteCerrarOtras(false)
        setAviso({ tipo: "exito", texto: "Listo: cerramos tus otras sesiones. Esta sesión sigue abierta." })
      } else if (resultado.estado === "sesion_vencida") {
        volverAlLogin()
      } else {
        setAviso({
          tipo: "advertencia",
          texto:
            resultado.estado === "demasiados_intentos"
              ? MENSAJE_LIMITE
              : "Todavía no pudimos cerrar tus otras sesiones. Probá de nuevo en unos minutos.",
        })
      }
    } finally {
      setEnviando(false)
    }
  }

  const descripcion = (campo: CampoCambioContrasena, ayuda?: string) =>
    [errores[campo] ? `error-${campo}` : null, ayuda].filter(Boolean).join(" ") || undefined

  return (
    <form onSubmit={alEnviar} noValidate className="max-w-md space-y-5" aria-label="Cambiar contraseña">
      <div className="space-y-2.5">
        <Label htmlFor="contrasenaActual" className="text-sm font-medium text-foreground">
          Contraseña actual
        </Label>
        <Input
          id="contrasenaActual"
          name="contrasenaActual"
          type="password"
          autoComplete="current-password"
          required
          aria-required="true"
          aria-invalid={errores.contrasenaActual ? true : undefined}
          aria-describedby={descripcion("contrasenaActual")}
          className={claseCampo}
        />
        {errores.contrasenaActual && (
          <p id="error-contrasenaActual" className="text-sm text-destructive">
            {errores.contrasenaActual}
          </p>
        )}
      </div>

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
          aria-describedby={descripcion("contrasenaNueva", "ayuda-contrasenaNueva")}
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
          aria-describedby={descripcion("confirmacion")}
          className={claseCampo}
        />
        {errores.confirmacion && (
          <p id="error-confirmacion" className="text-sm text-destructive">
            {errores.confirmacion}
          </p>
        )}
      </div>

      {aviso && (
        <p
          role={aviso.tipo === "exito" ? "status" : "alert"}
          className={
            aviso.tipo === "exito"
              ? "rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary"
              : "rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
          }
        >
          {aviso.texto}
        </p>
      )}

      {pendienteCerrarOtras && (
        <Button type="button" variant="outline" onClick={reintentarCierre} disabled={enviando}>
          Cerrar mis otras sesiones
        </Button>
      )}

      <Button
        type="submit"
        disabled={enviando}
        aria-busy={enviando}
        className="h-12 rounded-full px-8 text-sm font-normal tracking-wide"
      >
        {enviando ? "Guardando…" : "Cambiar contraseña"}
      </Button>
    </form>
  )
}
