import type { Metadata } from "next"
import { VistaModulo } from "@/components/admin/vistas-modulos"
export default function PaginaProductos() { return <VistaModulo modulo="productos" /> }

export const metadata: Metadata = { title: "Productos" }
