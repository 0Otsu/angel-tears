import { redirect } from "next/navigation"
import { exigirAdministradoraEnPagina } from "@/lib/modulos/autenticacion/guardia-admin"

// Compatibilidad de enlaces: misma fuente de datos, sin un segundo modulo.
export default async function PaginaEgresos({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await exigirAdministradoraEnPagina()
  const recibidos = await searchParams
  const filtros = new URLSearchParams()
  for (const campo of ["desde", "hasta", "estado", "limite", "periodo", "pagina"]) {
    const valor = recibidos[campo]
    if (typeof valor === "string") filtros.set(campo, valor)
  }
  redirect(`/admin/gastos${filtros.size ? `?${filtros}` : ""}`)
}
