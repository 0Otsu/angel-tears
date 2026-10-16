"use client"

import { useState } from "react"
import { Header } from "@/components/boty/header"
import { Footer } from "@/components/boty/footer"
import { productosPublicosDemo as catalogProducts, categoriasPublicas as categories } from "@/lib/mock/productos"
import { TarjetaProducto } from "@/components/publico/tarjeta-producto"
import identidad from "@/components/publico/identidad.module.css"

export function Catalogo() {
  const [selectedCategory, setSelectedCategory] = useState("Todos")
  const filteredProducts = selectedCategory === "Todos"
    ? catalogProducts
    : catalogProducts.filter((product) => product.category === selectedCategory)

  return (
    <main className={`min-h-screen ${identidad.sitio}`}>
      <Header />

      <section className="px-6 pb-12 pt-32 lg:px-8 lg:pt-40">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <span className="mb-4 block text-sm uppercase tracking-[0.3em] text-primary">Catálogo</span>
            <h1 className="mb-5 font-serif text-5xl leading-tight text-foreground md:text-6xl">Encontrá ese detalle que te representa</h1>
            <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">Explorá nuestra colección de accesorios y encontrá el que mejor acompaña tu estilo.</p>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">Catálogo de muestra: imágenes, nombres, precios y disponibilidad pendientes de confirmar.</p>
          </div>
        </div>
      </section>

      <section className="px-6 pb-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 -mx-6 overflow-x-auto px-6 pb-2 lg:mx-0 lg:px-0">
            <div className="flex min-w-max gap-2 lg:flex-wrap">
              {categories.map((category) => {
                const isActive = selectedCategory === category
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    aria-pressed={isActive}
                    className={`rounded-full px-5 py-2.5 text-sm transition-colors ${isActive ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
                  >
                    {category}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => (
              <TarjetaProducto key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
