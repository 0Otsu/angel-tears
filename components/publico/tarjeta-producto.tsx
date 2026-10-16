import Image from "next/image"
import Link from "next/link"
import { formatearPrecioDemo as formatPrice, type ProductoMock } from "@/lib/mock/productos"

export function TarjetaProducto({ product }: { product: ProductoMock }) {
  return (
              <Link href={`/catalogo/${product.id}`} className="group rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4">
                <article>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-card boty-shadow">
                    <Image src={product.image} alt={`${product.name}, accesorio de Angel Tears`} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                  </div>
                  <div className="flex items-start justify-between gap-4 px-1 pt-5">
                    <div>
                      <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">{product.category}</p>
                      <h2 className="font-serif text-2xl text-foreground">{product.name}</h2>
                      <p className="mt-2 text-sm text-muted-foreground">Consultar disponibilidad</p>
                    </div>
                    <p className="pt-1 text-sm font-medium text-foreground">{formatPrice(product.price)}</p>
                  </div>
                </article>
              </Link>
  )
}
