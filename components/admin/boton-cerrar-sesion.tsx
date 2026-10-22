"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { authClient } from "@/lib/infraestructura/auth-cliente"

// Cierre de sesion real (tarea 2.5): invalida la sesion en el servidor (la fila de la base y la
// cookie) y vuelve al login. Si el servidor no confirma el cierre, NO se navega: la sesion sigue
// abierta y se avisa, en vez de aparentar que se cerro.
export function BotonCerrarSesion() {
  const router = useRouter()
  const [cerrando, setCerrando] = useState(false)
  const [fallo, setFallo] = useState(false)

  async function cerrarSesion() {
    if (cerrando) return
    setCerrando(true)
    setFallo(false)
    try {
      const { error } = await authClient.signOut()
      if (error) {
        setFallo(true)
        return
      }
      router.push("/admin/login")
      router.refresh()
    } catch {
      setFallo(true)
    } finally {
      setCerrando(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={cerrarSesion}
        disabled={cerrando}
        aria-busy={cerrando}
        className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 text-left text-sm text-muted-foreground hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
      >
        <LogOut className="size-4" aria-hidden="true" />
        Cerrar sesión
      </button>
      {fallo && (
        <p role="alert" className="px-3.5 pt-1 text-xs text-destructive">
          No pudimos cerrar la sesión. Probá de nuevo.
        </p>
      )}
    </div>
  )
}
