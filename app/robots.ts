import type { MetadataRoute } from "next"
import { leerOrigenPublico } from "@/lib/modulos/catalogo/origen-publico"

export const dynamic = "force-dynamic"
export default function robots(): MetadataRoute.Robots {
  const origen = leerOrigenPublico()
  if (!origen) return { rules: { userAgent: "*", disallow: "/" } }
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] }, sitemap: `${origen}/sitemap.xml` }
}
