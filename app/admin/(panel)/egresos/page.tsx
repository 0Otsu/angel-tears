import type { Metadata } from "next"
import { VistaModulo } from "@/components/admin/vistas-modulos"
export default function PaginaEgresos() { return <VistaModulo modulo="egresos" /> }

export const metadata: Metadata = { title: "Egresos" }
