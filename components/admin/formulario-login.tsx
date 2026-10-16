"use client"

import { type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function FormularioLogin() {
  const router = useRouter()

  function simularIngreso(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    // Prototipo visual: no leer, almacenar ni enviar los valores del formulario.
    evento.currentTarget.reset()
    // TODO: reemplazar navegacion mock por autenticacion real.
    // No se validan credenciales, no se crea sesión y no se guardan datos.
    router.push("/admin")
  }

  return (
    <form
      onSubmit={simularIngreso}
      className="space-y-5"
      aria-label="Acceso administrativo de demostración"
    >
      <div className="space-y-2.5">
        <Label htmlFor="usuario" className="text-sm font-medium text-foreground">
          Correo o usuario
        </Label>
        <Input
          id="usuario"
          name="usuario"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          placeholder="Tu correo o usuario"
          className="h-12 rounded-xl border-border bg-background px-4 text-base shadow-none focus-visible:ring-2 focus-visible:ring-primary/20 md:text-base"
        />
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
          placeholder="Tu contraseña"
          className="h-12 rounded-xl border-border bg-background px-4 text-base shadow-none focus-visible:ring-2 focus-visible:ring-primary/20 md:text-base"
        />
      </div>

      <Button
        type="submit"
        className="group mt-2 h-13 w-full rounded-full px-8 text-sm font-normal tracking-wide boty-shadow boty-transition focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        Ingresar
        <ArrowRight className="size-4 boty-transition group-hover:translate-x-1" aria-hidden="true" />
      </Button>

    </form>
  )
}
