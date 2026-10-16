import type { Metadata } from "next"
import { VistaModulo } from "@/components/admin/vistas-modulos"
export default function PaginaStock() { return <VistaModulo modulo="stock" /> }

export const metadata: Metadata = { title: "Stock" }
