"use client"

import { useState } from "react"
import { ImagenProducto as Image } from "@/components/ui/imagen-producto"
import Link from "next/link"
import type { ProductoPublico } from "@/lib/modulos/catalogo/contrato"
import { formatearPrecioPublico } from "@/lib/modulos/catalogo/presentacion"
import { CATEGORIAS_INICIALES } from "@/lib/modulos/productos/categorias"
import identidad from "@/components/publico/identidad.module.css"

export function ProductGrid({ seleccion }: { seleccion: ProductoPublico[] }) {
  const categorias = ["Todos", ...CATEGORIAS_INICIALES.filter(c => seleccion.some(p => p.categoriaCodigo === c.codigo)).map(c => c.nombre)]
  const [categoria, setCategoria] = useState("Todos")
  const productos = seleccion.filter(producto => categoria === "Todos" || producto.categoriaNombre === categoria)

  return (
    <section id="coleccion" className={`bg-card py-24 ${identidad.ancla}`} aria-labelledby="coleccion-heading">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mb-16 text-center">
          <span className="mb-4 block text-sm uppercase tracking-[0.3em] text-primary">Selección Angel Tears</span>
          <h2 id="coleccion-heading" className="mb-4 text-balance font-serif text-4xl leading-tight text-foreground md:text-7xl">Accesorios para todos los días</h2>
          <p className="mx-auto max-w-md text-lg text-muted-foreground">Piezas elegidas para acompañarte en cada ocasión.</p>
        </div>
        <div className="mb-12 flex justify-center">
          <div role="group" aria-label="Filtrar selección por categoría" className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-background p-1">
            {categorias.map(nombre => <button key={nombre} type="button" aria-pressed={categoria === nombre} onClick={() => setCategoria(nombre)} className={`shrink-0 rounded-full px-3 py-2.5 text-sm font-medium boty-transition sm:px-6 ${categoria === nombre ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>{nombre}</button>)}
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {productos.map(producto => <Link key={producto.id} href={`/catalogo/${producto.slug}`} prefetch={false} className="group min-w-0 rounded-3xl [overflow-wrap:anywhere]">
            <article className="overflow-hidden rounded-3xl bg-background boty-shadow boty-transition group-hover:scale-[1.02]">
              <div className="relative aspect-square overflow-hidden bg-muted">{producto.imagen ? <Image src={producto.imagen.url} alt={producto.imagen.alt} fill sizes="(min-width: 1280px) 286px, (min-width: 1024px) calc((100vw - 136px) / 4), (min-width: 640px) calc((100vw - 72px) / 2), calc(100vw - 48px)" className="object-cover boty-transition group-hover:scale-105" /> : <span className="flex h-full items-center justify-center text-sm text-muted-foreground">Imagen no disponible</span>}</div>
              <div className="p-5"><h3 className="mb-1 font-serif text-lg text-foreground">{producto.nombre}</h3><p className="mb-3 text-sm text-muted-foreground">{producto.categoriaNombre} · Disponible</p><span className="font-medium text-foreground">{formatearPrecioPublico(producto.precio)}</span></div>
            </article>
          </Link>)}
        </div>
        {productos.length === 0 && <p role="status" className="text-center text-muted-foreground">No hay destacados disponibles por el momento.</p>}
        <div className="mt-12 text-center"><Link href="/catalogo" prefetch={false} className="inline-flex items-center justify-center rounded-full border border-foreground/20 px-8 py-4 text-sm tracking-wide text-foreground boty-transition hover:bg-foreground/5">Ver todos los accesorios</Link></div>
      </div>
    </section>
  )
}
