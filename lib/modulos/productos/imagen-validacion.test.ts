import { describe, expect, it } from "vitest"
import { crc32 } from "node:zlib"
import { crearImagenPrueba } from "@/pruebas/imagenes-producto"
import { validarArchivoImagen } from "./imagen-validacion"
import { MAXIMO_BYTES_IMAGEN } from "./imagen-contrato"

describe("decoder real de la imagen principal", () => {
  it.each(["jpeg", "png", "webp"] as const)("acepta %s real sin cambiar bytes", async (formato) => {
    const archivo = await crearImagenPrueba(formato)
    const copia = Buffer.from(archivo)
    expect(await validarArchivoImagen(archivo)).toMatchObject({ ancho: 12, alto: 8, formato })
    expect(archivo.equals(copia)).toBe(true)
  })
  it.each([Buffer.from("archivo falso .jpg"), Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>'), Buffer.from("GIF89a")])("rechaza contenido fuera de los tres tipos aprobados", async (archivo) => {
    await expect(validarArchivoImagen(archivo)).rejects.toMatchObject({ codigo: "tipo_invalido" })
  })
  it("rechaza un archivo con firma PNG valida pero corrupto", async () => {
    await expect(validarArchivoImagen(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]))).rejects.toMatchObject({ codigo: "imagen_corrupta" })
  })
  it("decodifica pixeles y rechaza JPEG truncado", async () => {
    const jpeg = await crearImagenPrueba("jpeg", 40, 40)
    await expect(validarArchivoImagen(jpeg.subarray(0, jpeg.byteLength - 20))).rejects.toMatchObject({ codigo: "imagen_corrupta" })
  })
  it("rechaza bytes excesivos antes de decodificar", async () => {
    await expect(validarArchivoImagen(new Uint8Array(MAXIMO_BYTES_IMAGEN + 1))).rejects.toMatchObject({ codigo: "exceso_bytes", status: 413 })
  })
  it("rechaza mas de 20 MP aunque el PNG comprimido pese menos de 3 MiB", async () => {
    const png = await crearImagenPrueba("png", 4500, 4500)
    expect(png.byteLength).toBeLessThan(MAXIMO_BYTES_IMAGEN)
    await expect(validarArchivoImagen(png)).rejects.toMatchObject({ codigo: "exceso_pixeles" })
  })
  it("rechaza una cabecera de miles de megapixeles antes de asignar el raster", async () => {
    const png = await crearImagenPrueba()
    // IHDR gigante con CRC correcto, sin materializar sus pixeles en memoria.
    png.writeUInt32BE(100_000, 16); png.writeUInt32BE(100_000, 20)
    png.writeUInt32BE(crc32(png.subarray(12, 29)), 29)
    await expect(validarArchivoImagen(png)).rejects.toMatchObject({ codigo: "exceso_pixeles" })
  })
})
