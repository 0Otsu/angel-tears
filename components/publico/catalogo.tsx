"use client"

import { useState } from "react"
import { Header } from "@/components/boty/header"
import { Footer } from "@/components/boty/footer"
import type { ProductoPublico } from "@/lib/modulos/catalogo/contrato"
import { CATEGORIAS_INICIALES } from "@/lib/modulos/productos/categorias"
import { TarjetaProducto } from "@/components/publico/tarjeta-producto"
import identidad from "@/components/publico/identidad.module.css"

export function Catalogo({ productos }: { productos: ProductoPublico[] }) {
  const [selectedCategory, setSelectedCategory] = useState("Todos")
  const filteredProducts = selectedCategory === "Todos"
    ? productos
    : productos.filter((product) => product.categoriaCodigo === selectedCategory)

  return (
    <main className={`min-h-screen ${identidad.sitio}`}>
      <Header />

      <section className="px-6 pb-12 pt-32 lg:px-8 lg:pt-40">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <span className="mb-4 block text-sm uppercase tracking-[0.3em] text-primary">Catálogo</span>
            <h1 className="mb-5 font-serif text-5xl leading-tight text-foreground md:text-6xl">Encontrá ese detalle que te representa</h1>
            <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">Explorá nuestra colección de accesorios y encontrá el que mejor acompaña tu estilo.</p>
          </div>
        </div>
      </section>

      <section className="px-6 pb-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 -mx-6 overflow-x-auto px-6 pb-2 lg:mx-0 lg:px-0">
            <div className="flex min-w-max gap-2 lg:flex-wrap">
              {[{ codigo: "Todos", nombre: "Todos" }, ...CATEGORIAS_INICIALES].map((category) => {
                const isActive = selectedCategory === category.codigo
                return (
                  <button
                    key={category.codigo}
                    type="button"
                    onClick={() => setSelectedCategory(category.codigo)}
                    aria-pressed={isActive}
                    className={`rounded-full px-5 py-2.5 text-sm transition-colors ${isActive ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
                  >
                    {category.nombre}
                  </button>
                )
              })}
            </div>
          </div>

          <p role="status" className="mb-6 text-sm text-muted-foreground">{filteredProducts.length === 0 ? (productos.length === 0 ? "No hay productos disponibles por el momento." : "No hay productos disponibles en esta categoría.") : `${filteredProducts.length} productos disponibles`}</p>
          <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product, indice) => (
              <TarjetaProducto key={product.id} product={product} prioridad={selectedCategory === "Todos" && indice === 0} />
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
