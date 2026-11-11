import type { Paginacion } from "@/lib/paginacion"
import { enlaceOperaciones, type FiltrosOperaciones } from "@/lib/presentacion/operaciones"
import { NavigationButton } from "@/components/ui/navigation-button"
export function PaginacionOperaciones({ ruta, filtros, datos }: { ruta: string; filtros: FiltrosOperaciones; datos: Paginacion }) {
  return <nav aria-label="Páginas del historial" className="flex flex-wrap items-center justify-between gap-3 pt-4">
    <p className="text-sm text-muted-foreground">Página {datos.pagina} de {datos.paginas}<span className="block text-xs">{datos.total} {datos.total === 1 ? "registro" : "registros"} · {datos.porPagina} por página</span></p>
    <div className="flex gap-2"><NavigationButton variant="outline" className="min-h-11" disabled={datos.pagina <= 1} href={enlaceOperaciones(ruta, filtros, datos.pagina - 1)}>Anterior</NavigationButton><NavigationButton variant="outline" className="min-h-11" disabled={datos.pagina >= datos.paginas} href={enlaceOperaciones(ruta, filtros, datos.pagina + 1)}>Siguiente</NavigationButton></div>
  </nav>
}
