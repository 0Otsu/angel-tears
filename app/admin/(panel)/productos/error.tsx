"use client"
import { Button } from "@/components/ui/button"
export default function ErrorProductos({ reset }: { reset: () => void }) {
  return <section className="space-y-4"><h1 className="text-2xl">No pudimos cargar Productos</h1><p role="alert">Intentá nuevamente. No modificamos los datos del producto.</p><Button onClick={reset}>Reintentar consulta</Button></section>
}
