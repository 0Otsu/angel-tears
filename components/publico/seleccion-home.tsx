import { ProductGrid } from "@/components/boty/product-grid"
import { listarDestacadosPublicos } from "@/lib/modulos/catalogo/aplicacion"

export async function SeleccionHome() {
  let productos
  try { productos = await listarDestacadosPublicos() } catch {
    return <section id="coleccion" className="bg-card px-6 py-24 text-center" aria-labelledby="coleccion-heading">
      <h2 id="coleccion-heading" className="mb-6 font-serif text-4xl">Selección Angel Tears</h2>
      <p role="alert" className="mb-6 text-muted-foreground">No pudimos cargar los productos. Intentá nuevamente.</p>
      <form action="/#coleccion" method="get"><button className="rounded-full bg-primary px-6 py-3 text-primary-foreground">Reintentar</button></form>
    </section>
  }
  return <ProductGrid seleccion={productos} />
}
