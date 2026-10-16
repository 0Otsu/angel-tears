import type { Metadata } from "next"
import { VistaModulo } from "@/components/admin/vistas-modulos"
export default function PaginaProveedores() { return <VistaModulo modulo="proveedores" /> }

export const metadata: Metadata = { title: "Proveedores" }
