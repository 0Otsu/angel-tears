import { redirect } from "next/navigation"
import { exigirAdministradoraEnPagina } from "@/lib/modulos/autenticacion/guardia-admin"
import { enlaceFiltroStock, filtroStock } from "@/lib/presentacion/inventario"

// Marcadores antiguos conservan sus filtros. Las Actions de Inventario permanecen
// en esta ruta y siguen exigiendo autorizacion propia para cada operacion.
export default async function PaginaStock({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  await exigirAdministradoraEnPagina()
  redirect(enlaceFiltroStock(filtroStock((await searchParams).estado)))
}