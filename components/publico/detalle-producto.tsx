import Image from "next/image"
import Link from "next/link"
import type { ProductoPublico } from "@/lib/modulos/catalogo/contrato"
import { formatearPrecioPublico as formatPrice } from "@/lib/modulos/catalogo/presentacion"
import { TarjetaProducto } from "./tarjeta-producto"
import { ChevronLeft, Instagram } from "lucide-react"
import { Header } from "@/components/boty/header"
import { Footer } from "@/components/boty/footer"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { negocioPublico } from "@/lib/negocio-publico"
import identidad from "@/components/publico/identidad.module.css"

function ProductInfo({ product }: { product: ProductoPublico }) {
  return (
    <div className="flex min-w-0 flex-col [overflow-wrap:anywhere]">
      <div className="mb-8">
        <p className="mb-3 text-sm uppercase tracking-[0.3em] text-primary">{product.categoriaNombre}</p>
        <h1 className="mb-4 font-serif text-4xl leading-tight text-foreground md:text-5xl">{product.nombre}</h1>
        {product.descripcion && <p className="leading-relaxed text-foreground/80">{product.descripcion}</p>}
      </div>

      <div className="mb-7 flex flex-wrap items-center gap-4">
        <p className="min-w-0 max-w-full text-3xl font-medium text-foreground">{formatPrice(product.precio)}</p>
        <span className="rounded-full bg-card px-3 py-1 text-xs text-foreground">{product.disponible ? "Disponible" : "Sin stock"}</span>
      </div>

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
        <Link prefetch={false}
          href="/catalogo"
          className="inline-flex flex-1 items-center justify-center rounded-full border border-foreground/20 px-8 py-4 text-sm tracking-wide text-foreground boty-transition hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Volver al catálogo
        </Link>
      </div>

      <Accordion type="single" collapsible defaultValue="details" className="border-t border-border/50">
        {(product.material || product.medida || product.color) && <AccordionItem value="details" className="border-border/50">
          <AccordionTrigger>Detalles del producto</AccordionTrigger>
          <AccordionContent><dl className="space-y-2 text-muted-foreground">{[["Material", product.material], ["Medida", product.medida], ["Color", product.color]].filter(([, valor]) => valor).map(([etiqueta, valor]) => <div key={etiqueta}><dt className="inline font-medium">{etiqueta}: </dt><dd className="inline">{valor}</dd></div>)}</dl></AccordionContent>
        </AccordionItem>}
        <AccordionItem value="delivery" className="border-border/50">
          <AccordionTrigger>Formas de entrega</AccordionTrigger>
          <AccordionContent><p className="leading-relaxed text-muted-foreground">Podés visitarnos en Entre Ríos 924, planta baja, detrás de las escaleras, en Concordia. Realizamos envíos en Concordia a cargo del cliente. Consultanos por Instagram para coordinar.</p></AccordionContent>
        </AccordionItem>
        {product.cuidados && <AccordionItem value="care" className="border-border/50">
          <AccordionTrigger>Cuidados</AccordionTrigger>
          <AccordionContent><p className="leading-relaxed text-muted-foreground">{product.cuidados}</p></AccordionContent>
        </AccordionItem>}
        <AccordionItem value="availability" className="border-border/50">
          <AccordionTrigger>Consulta y disponibilidad</AccordionTrigger>
          <AccordionContent><p className="leading-relaxed text-muted-foreground">Escribinos a {negocioPublico.usuarioInstagram} para confirmar disponibilidad y consultar por esta pieza.</p></AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}

export function DetalleProducto({ product, relacionados }: { product: ProductoPublico; relacionados: ProductoPublico[] }) {
  return (
    <main className={`min-h-screen ${identidad.sitio}`}>
      <Header />
      <div className="px-6 pb-24 pt-32 lg:px-8 lg:pt-40">
        <div className="mx-auto max-w-7xl">
          <Link href="/catalogo" prefetch={false} className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground boty-transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
            <ChevronLeft className="size-4" aria-hidden="true" />
            Volver al catálogo
          </Link>

          <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-20">
            <div className="relative aspect-square overflow-hidden rounded-3xl bg-card boty-shadow">
              {product.imagen ? <Image src={product.imagen.url} alt={product.imagen.alt} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" priority /> : <span className="flex h-full items-center justify-center text-muted-foreground">Imagen no disponible</span>}
            </div>
            <ProductInfo product={product} />
          </div>

          {relacionados.length > 0 && <section className="mt-24 border-t border-border/50 pt-16" aria-labelledby="related-products-heading">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="mb-3 text-sm uppercase tracking-[0.3em] text-primary">Seguí explorando</p>
                <h2 id="related-products-heading" className="font-serif text-3xl text-foreground">También te puede interesar</h2>
              </div>
              <Link href="/catalogo" className="hidden text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline sm:block">Ver catálogo</Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-3">
              {relacionados.map((relacionado) => <TarjetaProducto key={relacionado.id} product={relacionado} nivelTitulo="h3" />)}
            </div>
          </section>}
        </div>
      </div>
      <Footer />
    </main>
  )
}
