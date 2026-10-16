import type { Metadata } from "next"
import { ReportesAdmin } from "@/components/admin/reportes-admin"
export default function PaginaReportes() { return <ReportesAdmin /> }

export const metadata: Metadata = { title: "Reportes" }
