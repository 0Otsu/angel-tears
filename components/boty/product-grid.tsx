"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { productosPublicosDemo, formatearPrecioDemo } from "@/lib/mock/productos"
import identidad from "@/components/publico/identidad.module.css"

const categorias = ["Todos", "Collares", "Pulseras", "Anillos"]
// Selección mock existente con sus cuatro fichas de producto correspondientes.
const seleccion = productosPublicosDemo.slice(0, 4)

export function ProductGrid() {
  const [categoria, setCategoria] = useState("Todos")
  const productos = seleccion.filter(producto => categoria === "Todos" || producto.category === categoria)

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
          {productos.map(producto => <Link key={producto.id} href={`/catalogo/${producto.id}`} className="group">
            <article className="overflow-hidden rounded-3xl bg-background boty-shadow boty-transition group-hover:scale-[1.02]">
              <div className="relative aspect-square overflow-hidden bg-muted"><Image src={producto.image} alt={`${producto.name}, imagen de muestra`} fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className="object-cover boty-transition group-hover:scale-105" /></div>
              <div className="p-5"><h3 className="mb-1 font-serif text-lg text-foreground">{producto.name}</h3><p className="mb-3 text-sm text-muted-foreground">{producto.category} · Disponibilidad a consultar</p><span className="font-medium text-foreground">{formatearPrecioDemo(producto.price)}</span></div>
            </article>
          </Link>)}
        </div>
        <div className="mt-12 text-center"><Link href="/catalogo" className="inline-flex items-center justify-center rounded-full border border-foreground/20 px-8 py-4 text-sm tracking-wide text-foreground boty-transition hover:bg-foreground/5">Ver todos los accesorios</Link><p className="mt-6 text-xs leading-relaxed text-muted-foreground">Selección de muestra. Imágenes, nombres, precios y disponibilidad pendientes de confirmar.</p></div>
      </div>
    </section>
  )
}
