import { obtenerNegocioPublico } from "@/lib/modulos/configuracion/aplicacion"
import { Catalogo } from "@/components/publico/catalogo"
import { listarCatalogoPublico } from "@/lib/modulos/catalogo/aplicacion"
import { metadataPublica } from "@/lib/modulos/catalogo/metadata-publica"
export const dynamic = "force-dynamic"
export function generateMetadata() { return metadataPublica("Catálogo de accesorios", "Explorá nuestros aros, collares, pulseras, anillos y más.", "/catalogo") }
export default async function PaginaCatalogo() {
  const [productos, negocioPublico] = await Promise.all([listarCatalogoPublico(), obtenerNegocioPublico()])
  return <Catalogo productos={productos} negocioPublico={negocioPublico} />
}
