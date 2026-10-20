import type { ExigirAdministradora } from "@/lib/modulos/autenticacion/contrato"
import type { ConsultarProductosInternos, ProductoInterno } from "@/lib/modulos/productos/contrato"
import { esquemaIdsProducto } from "@/lib/modulos/productos/validacion"

type LeerProductos = (ids: readonly string[]) => Promise<readonly ProductoInterno[]>

/** Auth antes de toda lectura. Se inyecta el contrato E0, no otro modelo User ni guard. */
export function crearConsultarProductosInternos(
  exigir: ExigirAdministradora,
  leer: LeerProductos,
): ConsultarProductosInternos {
  return async (encabezados, productoIds) => {
    await exigir(encabezados)
    const ids = esquemaIdsProducto.parse(productoIds)
    if (ids.length === 0) return []
    // Proyeccion allowlist: ni un doble con campos extra puede filtrarlos al consumidor.
    return (await leer(ids)).map((fila) => ({
      id: fila.id,
      nombre: fila.nombre,
      slug: fila.slug,
      categoriaCodigo: fila.categoriaCodigo,
      categoriaNombre: fila.categoriaNombre,
      precio: fila.precio,
      moneda: fila.moneda,
      publicado: fila.publicado,
      imagenValida: fila.imagenValida,
    }))
  }
}
