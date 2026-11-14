import { expect, it } from "vitest"
import { PRODUCTOS_DEMO } from "./plan"
import { validarImagenesDemo } from "./imagenes"

function manifiesto() {
  return Object.fromEntries(PRODUCTOS_DEMO.filter(p => p.publicar).map(p => {
    const publicId = `angel-tears/demo-20261118/productos/${p.id}/imagen`
    return [p.id, { assetId: `fixture-${p.id}`, publicId, versionProveedor: "1", ancho: 600, alto: 600, formato: "webp",
      urlSegura: `https://res.cloudinary.com/cloud-demo/image/upload/v1/${publicId}.webp` }]
  }))
}
it("acepta referencias completas del cloud y prefijo demo sin subir ni descargar", () => {
  expect(Object.keys(validarImagenesDemo(manifiesto(), "cloud-demo"))).toHaveLength(PRODUCTOS_DEMO.filter(p => p.publicar).length)
})
it("rechaza imagenes comerciales, cloud distinto y catalogo incompleto", () => {
  expect(() => validarImagenesDemo(manifiesto(), "cloud-comercial")).toThrow()
  const faltante = manifiesto()
  delete faltante[PRODUCTOS_DEMO[0].id]
  expect(() => validarImagenesDemo(faltante, "cloud-demo")).toThrow("Faltan")
  const ajena = manifiesto()
  ajena[PRODUCTOS_DEMO[0].id].publicId = "angel-tears/produccion/productos/otro/imagen"
  expect(() => validarImagenesDemo(ajena, "cloud-demo")).toThrow()
})
