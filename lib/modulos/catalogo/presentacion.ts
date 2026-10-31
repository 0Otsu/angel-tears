/** Formato exacto: conserva centavos y enteros grandes sin convertir dinero a float. */
export function formatearPrecioPublico(precio: string): string {
  const [entero, decimales = "00"] = precio.split(".")
  return `$${new Intl.NumberFormat("es-AR").format(BigInt(entero))}${decimales === "00" ? "" : `,${decimales}`}`
}
