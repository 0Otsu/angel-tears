import type { MetadataRoute } from "next"
import { leerOrigenIndexable } from "@/lib/modulos/catalogo/origen-publico"

export const dynamic = "force-dynamic"
export default function robots(): MetadataRoute.Robots {
  const origen = leerOrigenIndexable()
  // El rastreador tiene que poder leer el noindex de las páginas públicas de la demo.
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] }, ...(origen ? { sitemap: `${origen}/sitemap.xml` } : {}) }
}
