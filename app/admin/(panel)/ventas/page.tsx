import type { Metadata } from "next"
import { VistaModulo } from "@/components/admin/vistas-modulos"
export default function PaginaVentas() { return <VistaModulo modulo="ventas" /> }

export const metadata: Metadata = { title: "Ventas" }
