// El valor de demo es explicito: NODE_ENV=production tambien rige en Vercel Preview.
export function carpetaImagenes(entorno: Record<string, string | undefined> = process.env): string {
  if (entorno.CLOUDINARY_CARPETA_ENTORNO === "demo-20261118") return "demo-20261118"
  if (entorno.CLOUDINARY_CARPETA_ENTORNO) throw new Error("Carpeta de imagenes no permitida.")
  return entorno.NODE_ENV === "production" ? "produccion" : "desarrollo"
}
