import type { ProductoPublico } from "./contrato"

export function categoriasVisibles(productos: readonly ProductoPublico[]) {
  const categorias = new Map(productos.map(p => [p.categoriaCodigo, p.categoriaNombre]))
  return Array.from(categorias, ([codigo, nombre]) => ({ codigo, nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
}
