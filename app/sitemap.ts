import type { MetadataRoute } from "next"
import { listarProductosIndexables } from "@/lib/modulos/catalogo/aplicacion"
import { leerOrigenPublico } from "@/lib/modulos/catalogo/origen-publico"

export const dynamic = "force-dynamic"
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origen = leerOrigenPublico()
  if (!origen) return []
  const productos = await listarProductosIndexables()
  return [
    { url: `${origen}/` }, { url: `${origen}/catalogo` },
    ...productos.map((producto) => ({ url: `${origen}/catalogo/${producto.slug}`, lastModified: producto.modificadoEn })),
  ]
}
