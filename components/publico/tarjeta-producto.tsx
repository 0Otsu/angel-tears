import Image from "next/image"
import Link from "next/link"
import type { ProductoPublico } from "@/lib/modulos/catalogo/contrato"
import { formatearPrecioPublico as formatPrice } from "@/lib/modulos/catalogo/presentacion"

export function TarjetaProducto({ product, nivelTitulo = "h2" }: { product: ProductoPublico; nivelTitulo?: "h2" | "h3" }) {
  const Titulo = nivelTitulo
  return (
              <Link href={`/catalogo/${product.slug}`} prefetch={false} className="group min-w-0 rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4">
                <article>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-card boty-shadow">
                    {product.imagen ? <Image src={product.imagen.url} alt={product.imagen.alt} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-105" /> : <span className="flex h-full items-center justify-center text-sm text-muted-foreground">Imagen no disponible</span>}
                  </div>
                  <div className="flex items-start justify-between gap-4 px-1 pt-5">
                    <div className="min-w-0 [overflow-wrap:anywhere]">
                      <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">{product.categoriaNombre}</p>
                      <Titulo className="font-serif text-2xl text-foreground">{product.nombre}</Titulo>
                      <p className="mt-2 text-sm text-muted-foreground">{product.disponible ? "Disponible" : "Sin stock"}</p>
                    </div>
                    <p className="min-w-0 pt-1 text-sm font-medium text-foreground [overflow-wrap:anywhere]">{formatPrice(product.precio)}</p>
                  </div>
                </article>
              </Link>
  )
}
