import type { Metadata } from "next"
import { ResumenAdmin } from "@/components/admin/resumen-admin"
export default function PaginaResumen() { return <ResumenAdmin /> }

export const metadata: Metadata = { title: "Resumen" }
