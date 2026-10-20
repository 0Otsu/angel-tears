/** Slug de alta; nunca recalcular al modificar el nombre de un producto existente. */
export function crearSlugBase(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "producto"
}

/** El UUID completo evita colisiones entre productos que comparten un prefijo de ID. */
export function candidatosSlug(nombre: string, productoId: string): readonly [string, string] {
  const base = crearSlugBase(nombre)
  return [base, `${base}-${productoId}`]
}
