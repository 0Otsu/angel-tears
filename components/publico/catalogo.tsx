"use client"

import { useState } from "react"
import { Header } from "@/components/boty/header"
import type { NegocioPublico } from "@/lib/negocio-publico"
import { Footer } from "@/components/boty/footer"
import type { ProductoPublico } from "@/lib/modulos/catalogo/contrato"
import { categoriasVisibles } from "@/lib/modulos/catalogo/categorias-visibles"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TarjetaProducto } from "@/components/publico/tarjeta-producto"
import identidad from "@/components/publico/identidad.module.css"

export function Catalogo({ productos, negocioPublico }: { productos: ProductoPublico[]; negocioPublico?: NegocioPublico }) {
  const categorias = categoriasVisibles(productos)
  const [seleccion, seleccionar] = useState("Todos")
  const selectedCategory = categorias.some(categoria => categoria.codigo === seleccion) ? seleccion : "Todos"
  if (seleccion !== selectedCategory) seleccionar(selectedCategory)

  const principales = [{ codigo: "Todos", nombre: "Todos" }, ...categorias.slice(0, 5)]
  const restantes = categorias.slice(5)
  const enRestantes = restantes.some(categoria => categoria.codigo === selectedCategory)
  const menu = "max-h-[min(18rem,var(--radix-select-content-available-height))] max-w-[calc(100vw-1rem)] [&_[data-radix-select-viewport]]:h-auto"
  const filteredProducts = selectedCategory === "Todos"
    ? productos
    : productos.filter((product) => product.categoriaCodigo === selectedCategory)

  return (
    <main className={`min-h-screen ${identidad.sitio}`}>
      <Header negocioPublico={negocioPublico} />

      <section className="px-6 pb-12 pt-32 lg:px-8 lg:pt-40">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <span className="mb-4 block text-sm uppercase tracking-[0.3em] text-primary">Catálogo</span>
            <h1 className="mb-5 font-serif text-5xl leading-tight text-foreground md:text-6xl">Catálogo de bijouterie y accesorios</h1>
            <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">Explorá nuestros aros, piercings, collares, pulseras, anillos y más. Filtrá por categoría y descubrí los productos disponibles.</p>
          </div>
        </div>
      </section>

      <section className="px-6 pb-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 lg:hidden">
            <label htmlFor="filtro-categoria" className="mb-2 block text-sm font-medium">Filtrar por categoría</label>
            <Select value={selectedCategory} onValueChange={seleccionar}>
              <SelectTrigger id="filtro-categoria" className="w-full max-w-md rounded-full bg-card data-[size=default]:h-11"><SelectValue /></SelectTrigger>
              <SelectContent collisionPadding={8} className={menu}>
                <SelectItem value="Todos" className="min-h-11">Todas las categorías</SelectItem>
                {categorias.map(categoria => <SelectItem key={categoria.codigo} value={categoria.codigo} className="min-h-11 whitespace-normal [overflow-wrap:anywhere]">{categoria.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div role="group" aria-label="Categorías del catálogo" className="mb-8 hidden flex-wrap items-center gap-2 lg:flex">
            {principales.map(categoria => (
              <button
                key={categoria.codigo}
                type="button"
                aria-pressed={selectedCategory === categoria.codigo}
                onClick={() => seleccionar(categoria.codigo)}
                className={`min-h-11 max-w-56 rounded-full px-5 py-2.5 text-sm transition-colors [overflow-wrap:anywhere] ${selectedCategory === categoria.codigo ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
              >{categoria.nombre}</button>
            ))}
            {restantes.length > 0 && (
              <Select value={enRestantes ? selectedCategory : ""} onValueChange={seleccionar}>
                <SelectTrigger aria-label="Más categorías" className={`max-w-56 rounded-full data-[size=default]:h-11 ${enRestantes ? "border-primary bg-primary text-primary-foreground [&_svg]:text-primary-foreground" : "bg-card"}`}>
                  <SelectValue placeholder="Más categorías" />
                </SelectTrigger>
                <SelectContent collisionPadding={8} className={menu}>
                  {restantes.map(categoria => <SelectItem key={categoria.codigo} value={categoria.codigo} className="min-h-11 whitespace-normal [overflow-wrap:anywhere]">{categoria.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>

          <p role="status" className="mb-6 text-sm text-muted-foreground">{filteredProducts.length === 0 ? (productos.length === 0 ? "No hay productos disponibles por el momento." : "No hay productos disponibles en esta categoría.") : `${filteredProducts.length} productos disponibles`}</p>
          <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product, indice) => (
              <TarjetaProducto key={product.id} product={product} prioridad={selectedCategory === "Todos" && indice === 0} />
            ))}
          </div>
        </div>
      </section>

      <Footer negocioPublico={negocioPublico} />
    </main>
  )
}
