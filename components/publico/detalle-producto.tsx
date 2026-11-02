import { VistaDetalleProducto } from "./vista-detalle-producto"
import Link from "next/link"
import type { ProductoPublico } from "@/lib/modulos/catalogo/contrato"
import { TarjetaProducto } from "./tarjeta-producto"
import { ChevronLeft } from "lucide-react"
import { Header } from "@/components/boty/header"
import { Footer } from "@/components/boty/footer"
import identidad from "@/components/publico/identidad.module.css"

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

          <VistaDetalleProducto product={product} />

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
