import { expect, it } from "vitest"
import { carpetaImagenes } from "./carpeta-imagenes"
it("mantiene entornos existentes y aisla demo tambien en produccion", () => {
  expect(carpetaImagenes({ NODE_ENV: "production" })).toBe("produccion")
  expect(carpetaImagenes({ NODE_ENV: "development" })).toBe("desarrollo")
  expect(carpetaImagenes({ NODE_ENV: "production", CLOUDINARY_CARPETA_ENTORNO: "demo-20261118" })).toBe("demo-20261118")
  expect(() => carpetaImagenes({ CLOUDINARY_CARPETA_ENTORNO: "../produccion" })).toThrow()
})
