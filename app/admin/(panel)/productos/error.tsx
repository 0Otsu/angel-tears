"use client"
import { useTransition } from "react"
import { PendingButton } from "@/components/ui/pending-button"
export default function ErrorProductos({ reset }: { reset: () => void }) {
  const [pendiente, iniciar] = useTransition()
  return <section className="space-y-4"><h1 className="text-2xl">No pudimos cargar Productos</h1><p role="alert">Intentá nuevamente. No modificamos los datos del producto.</p><PendingButton pending={pendiente} pendingLabel="Reintentando…" onClick={() => iniciar(reset)}>Reintentar consulta</PendingButton></section>
}
