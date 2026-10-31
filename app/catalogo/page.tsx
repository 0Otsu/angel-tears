import { Catalogo } from "@/components/publico/catalogo"
import { listarCatalogoPublico } from "@/lib/modulos/catalogo/aplicacion"
import { metadataPublica } from "@/lib/modulos/catalogo/metadata-publica"
export const dynamic = "force-dynamic"
export function generateMetadata() { return metadataPublica("Catálogo", "Accesorios y regalos de Angel Tears en Concordia.", "/catalogo") }
export default async function PaginaCatalogo() { return <Catalogo productos={await listarCatalogoPublico()} /> }
