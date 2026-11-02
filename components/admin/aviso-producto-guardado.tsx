"use client"

import { useEffect, useState } from "react"
import { CheckCircle2 } from "lucide-react"

export function AvisoProductoGuardado({ texto }: { texto: string }) {
  const [visible, mostrar] = useState(true)
  useEffect(() => {
    // Consumir la confirmacion sin recargar el listado ni dejarla en el historial.
    const url = new URL(window.location.href)
    if (url.searchParams.has("cancelado")) {
      url.searchParams.delete("cancelado")
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`)
    }
    const temporizador = window.setTimeout(() => mostrar(false), 5000)
    return () => window.clearTimeout(temporizador)
  }, [])
  if (!visible) return null
  return <div role="status" aria-live="polite" className="fixed bottom-5 right-4 z-50 flex max-w-[calc(100vw-2rem)] items-start gap-3 rounded-xl border border-primary/25 bg-background p-4 text-sm shadow-lg sm:right-6 sm:max-w-sm">
    <CheckCircle2 aria-hidden="true" className="size-5 shrink-0 text-primary" />
    <span>{texto}</span>
  </div>
}
