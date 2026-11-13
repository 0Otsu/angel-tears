import { Catalogo } from "@/components/publico/catalogo"
import { listarCatalogoPublico } from "@/lib/modulos/catalogo/aplicacion"
import { metadataPublica } from "@/lib/modulos/catalogo/metadata-publica"
export const dynamic = "force-dynamic"
export function generateMetadata() { return metadataPublica("Catálogo de bijouterie y accesorios", "Explorá los productos disponibles de Angel Tears: aros, collares, pulseras, anillos y más. Consultá precios y detalles en nuestro catálogo.", "/catalogo") }
export default async function PaginaCatalogo() { return <Catalogo productos={await listarCatalogoPublico()} /> }
