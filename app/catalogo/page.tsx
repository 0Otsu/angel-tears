import type { Metadata } from "next"
import { Catalogo } from "@/components/publico/catalogo"
import { listarCatalogoPublico } from "@/lib/modulos/catalogo/aplicacion"
export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Catálogo", description: "Accesorios y regalos de Angel Tears en Concordia." }
export default async function PaginaCatalogo() { return <Catalogo productos={await listarCatalogoPublico()} /> }
