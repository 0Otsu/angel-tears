"use client"

import Image from "next/image"
import Link from "next/link"
import { productosPublicosDemo, formatearPrecioDemo, type ProductoMock } from "@/lib/mock/productos"
import { ChevronLeft, Instagram } from "lucide-react"
import { Header } from "@/components/boty/header"
import { Footer } from "@/components/boty/footer"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { negocioPublico } from "@/lib/negocio-publico"
import identidad from "@/components/publico/identidad.module.css"

const relatedProducts = productosPublicosDemo.slice(0, 3)
const formatPrice = formatearPrecioDemo

function ProductInfo({ product }: { product: ProductoMock }) {
  return (
    <div className="flex flex-col">
      <div className="mb-8">
        <p className="mb-3 text-sm uppercase tracking-[0.3em] text-primary">{product.category}</p>
        <h1 className="mb-4 font-serif text-4xl leading-tight text-foreground md:text-5xl">{product.name}</h1>
        <p className="mb-5 text-lg italic text-muted-foreground">{product.tagline}</p>
        <p className="leading-relaxed text-foreground/80">{product.description}</p>
      </div>

      <div className="mb-7 flex items-center gap-4">
        <p className="text-3xl font-medium text-foreground">{formatPrice(product.price)}</p>
        <span className="rounded-full bg-card px-3 py-1 text-xs text-foreground">A consultar</span>
      </div>
      <p className="mb-6 text-xs leading-relaxed text-muted-foreground">Producto, imagen y precio de muestra. Confirmá los detalles y la disponibilidad en Instagram.</p>

      <div className="mb-9 flex flex-col gap-3 sm:flex-row">
        <a
          href={negocioPublico.instagram}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-sm tracking-wide text-primary-foreground boty-shadow boty-transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Instagram className="size-4" aria-hidden="true" />
          Consultar por Instagram
        </a>
        <Link
          href="/catalogo"
          className="inline-flex flex-1 items-center justify-center rounded-full border border-foreground/20 px-8 py-4 text-sm tracking-wide text-foreground boty-transition hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Volver al catálogo
        </Link>
      </div>

      <Accordion type="single" collapsible defaultValue="details" className="border-t border-border/50">
        <AccordionItem value="details" className="border-border/50">
          <AccordionTrigger>Detalles del producto</AccordionTrigger>
          <AccordionContent><p className="leading-relaxed text-muted-foreground">{product.details}</p></AccordionContent>
        </AccordionItem>
        <AccordionItem value="delivery" className="border-border/50">
          <AccordionTrigger>Formas de entrega</AccordionTrigger>
          <AccordionContent><p className="leading-relaxed text-muted-foreground">Podés visitarnos en Entre Ríos 924, planta baja, detrás de las escaleras, en Concordia. Realizamos envíos en Concordia a cargo del cliente. Consultanos por Instagram para coordinar.</p></AccordionContent>
        </AccordionItem>
        <AccordionItem value="care" className="border-border/50">
          <AccordionTrigger>Cuidados</AccordionTrigger>
          <AccordionContent><p className="mb-3 leading-relaxed text-muted-foreground">Orientaciones generales publicadas en Instagram. Confirmá los cuidados adecuados según la pieza.</p><ul className="list-disc space-y-2 pl-5 text-muted-foreground"><li>Evitá el contacto con el agua.</li><li>Evitá usar accesorios al hacer deporte.</li><li>Aplicá cremas, maquillaje y perfumes antes de ponértelos.</li><li>Evitá dormir con los accesorios cuando corresponda.</li></ul></AccordionContent>
        </AccordionItem>
        <AccordionItem value="availability" className="border-border/50">
          <AccordionTrigger>Consulta y disponibilidad</AccordionTrigger>
          <AccordionContent><p className="leading-relaxed text-muted-foreground">Escribinos a {negocioPublico.usuarioInstagram} para confirmar disponibilidad y consultar por esta pieza.</p></AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}

export function DetalleProducto({ product }: { product: ProductoMock }) {
  return (
    <main className={`min-h-screen ${identidad.sitio}`}>
      <Header />
      <div className="px-6 pb-24 pt-32 lg:px-8 lg:pt-40">
        <div className="mx-auto max-w-7xl">
          <Link href="/catalogo" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground boty-transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
            <ChevronLeft className="size-4" aria-hidden="true" />
            Volver al catálogo
          </Link>

          <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-20">
            <div className="relative aspect-square overflow-hidden rounded-3xl bg-card boty-shadow">
              <Image src={product.image} alt={`${product.name}, ${product.category} de Angel Tears`} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" priority />
            </div>
            <ProductInfo product={product} />
          </div>

          <section className="mt-24 border-t border-border/50 pt-16" aria-labelledby="related-products-heading">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="mb-3 text-sm uppercase tracking-[0.3em] text-primary">Seguí explorando</p>
                <h2 id="related-products-heading" className="font-serif text-3xl text-foreground">También te puede interesar</h2>
              </div>
              <Link href="/catalogo" className="hidden text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline sm:block">Ver catálogo</Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-3">
              {relatedProducts.map((relatedProduct) => (
                <Link key={relatedProduct.id} href={`/catalogo/${relatedProduct.id}`} className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-card boty-shadow">
                    <Image src={relatedProduct.image} alt={`${relatedProduct.name}, accesorio de Angel Tears`} fill sizes="(min-width: 640px) 33vw, 100vw" className="object-cover boty-transition group-hover:scale-105" />
                  </div>
                  <div className="flex items-start justify-between gap-3 px-1 pt-4">
                    <div><p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">{relatedProduct.category}</p><h3 className="font-serif text-xl text-foreground">{relatedProduct.name}</h3></div>
                    <p className="pt-1 text-sm font-medium text-foreground">{formatPrice(relatedProduct.price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  )
}
