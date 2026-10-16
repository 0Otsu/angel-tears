import type { Metadata } from "next"
import { VistaModulo } from "@/components/admin/vistas-modulos"
export default function PaginaCompras() { return <VistaModulo modulo="compras" /> }

export const metadata: Metadata = { title: "Compras" }
