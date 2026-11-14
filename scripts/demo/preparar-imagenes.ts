import { readFile, mkdir, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { crearAlmacenCloudinary } from "../../lib/modulos/productos/imagen-cloudinary"
import { validarArchivoImagen } from "../../lib/modulos/productos/imagen-validacion"
import type { ReferenciaImagen } from "../../lib/modulos/productos/imagen-contrato"
import { PRODUCTOS_DEMO } from "./plan"
import { validarImagenesDemo } from "./imagenes"
import { ErrorDemo } from "./seguridad"

/** Reutiliza exclusivamente los tres assets de producto ya versionados del prototipo.
 * El CLI exige destino y marcador demo antes de invocarlo. Nunca borra ni sobrescribe assets.
 */
export async function prepararImagenesDemo(entorno: Record<string, string | undefined>) {
  if (!entorno.CLOUDINARY_CLOUD_NAME || !entorno.CLOUDINARY_API_KEY || !entorno.CLOUDINARY_API_SECRET
    || entorno.CLOUDINARY_CARPETA_ENTORNO !== "demo-20261118") throw new ErrorDemo("Falta configurar Cloudinary exclusivo de DEMO y su prefijo.")
  const almacen = crearAlmacenCloudinary(entorno)
  const imagenes: Record<string, ReferenciaImagen> = {}
  const contenidos = new Map<string, Buffer>()
  for (const p of PRODUCTOS_DEMO) {
    const nombre = ["anillos", "aros-piercings"].includes(p.categoriaCodigo) ? "angel-tears-rings.png"
      : ["collares", "tobilleras"].includes(p.categoriaCodigo) ? "angel-tears-gold-jewelry.png" : "angel-tears-charms.png"
    let contenido = contenidos.get(nombre)
    if (!contenido) {
      contenido = await readFile(new URL(`../../public/images/products/${nombre}`, import.meta.url))
      await validarArchivoImagen(contenido)
      contenidos.set(nombre, contenido)
    }
    imagenes[p.id] = await almacen.almacenarImagen({ contenido,
      publicId: `angel-tears/demo-20261118/productos/${p.id}/catalogo-v1` })
  }
  validarImagenesDemo(imagenes, entorno.CLOUDINARY_CLOUD_NAME)
  const carpeta = fileURLToPath(new URL("../../work/", import.meta.url))
  await mkdir(carpeta, { recursive: true })
  await writeFile(new URL("../../work/demo-imagenes.json", import.meta.url), JSON.stringify(imagenes, null, 2) + "\n")
  return { referencias: Object.keys(imagenes).length, manifiesto: "work/demo-imagenes.json" }
}
