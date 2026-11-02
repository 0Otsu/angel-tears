"use client"
import { useState } from "react"
import Image from "next/image"
type Imagen = { url: string; ancho: number; alto: number; alt: string }
export function GaleriaPublica({ principal, medios }: { principal: Imagen | null; medios?: Imagen[] }) {
  const [seleccion, elegir] = useState<string | null>(null)
  const imagenes = medios?.length ? medios : principal ? [principal] : []
  const actual = imagenes.find(m => m.url === seleccion) ?? imagenes[0]
  return <section aria-label="Galería del producto" className="min-w-0 space-y-4">
    <div className="relative aspect-square overflow-hidden rounded-3xl bg-card boty-shadow">
      {actual ? <Image src={actual.url} alt={actual.alt} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" priority /> : <span className="flex h-full items-center justify-center text-muted-foreground">Imagen no disponible</span>}
    </div>
    {imagenes.length > 1 && <div className="flex flex-wrap gap-3" aria-label="Seleccionar imagen">{imagenes.map((m, i) => <button key={m.url} type="button" aria-label={`Ver imagen ${i + 1}`} aria-pressed={actual.url === m.url} onClick={() => elegir(m.url)} className={`relative size-16 overflow-hidden rounded-lg border-2 focus-visible:outline-2 focus-visible:outline-primary ${actual.url === m.url ? "border-primary" : "border-transparent"}`}>
      <Image src={m.url} alt="" fill sizes="64px" className="object-cover" />
    </button>)}</div>}
  </section>
}
