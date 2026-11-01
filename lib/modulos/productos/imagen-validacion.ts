import "server-only"
import sharp from "sharp"
import { ErrorImagen, MAXIMO_BYTES_IMAGEN, MAXIMO_PIXELES_IMAGEN } from "./imagen-contrato"

function formatoDe(bytes: Uint8Array) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg"
  if (Buffer.from(bytes.subarray(0, 8)).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "png"
  if (Buffer.from(bytes.subarray(0, 4)).toString() === "RIFF" && Buffer.from(bytes.subarray(8, 12)).toString() === "WEBP") return "webp"
  return null
}

export async function validarArchivoImagen(contenido: Uint8Array) {
  if (contenido.byteLength > MAXIMO_BYTES_IMAGEN) throw new ErrorImagen("exceso_bytes", 413)
  if (!formatoDe(contenido)) throw new ErrorImagen("tipo_invalido", 415)
  try {
    const buffer = Buffer.from(contenido)
    // Leer dimensiones antes de decodificar; no se habilita unlimited ni formatos vectoriales.
    // Solo metadata: no asigna el raster. Permite clasificar incluso cabeceras gigantes
    // como exceso de pixeles; la decodificacion posterior SI mantiene el limite de 20 MP.
    const metadata = await sharp(buffer, { failOn: "warning", limitInputPixels: false }).metadata()
    if (!metadata.width || !metadata.height) throw new ErrorImagen("imagen_corrupta", 422)
    if (metadata.width * metadata.height * (metadata.pages ?? 1) > MAXIMO_PIXELES_IMAGEN) throw new ErrorImagen("exceso_pixeles", 422)
    if (!["jpeg", "png", "webp"].includes(metadata.format ?? "")) throw new ErrorImagen("tipo_invalido", 415)
    // stats fuerza la decodificacion completa: metadata sola no detecta pixeles truncados.
    // Se descarta el resultado; se suben los bytes originales, sin resize ni conversion.
    await sharp(buffer, { failOn: "warning", limitInputPixels: MAXIMO_PIXELES_IMAGEN, animated: true }).stats()
    return { ancho: metadata.width, alto: metadata.height, formato: metadata.format }
  } catch (error) {
    if (error instanceof ErrorImagen) throw error
    throw new ErrorImagen("imagen_corrupta", 422)
  }
}
