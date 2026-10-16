import type { Metadata } from "next"
import { Catalogo } from "@/components/publico/catalogo"
export const metadata: Metadata = { title: "Catálogo", description: "Accesorios y regalos de Angel Tears en Concordia. Catálogo de demostración." }
export default function PaginaCatalogo() { return <Catalogo /> }
