import { expect, it } from "vitest"
import { deliveryCloudinary, urlCloudinaryVersionada, urlImagenSegura } from "./imagen-delivery"
const original = "https://res.cloudinary.com/pruebas/image/upload/v123/angel-tears/desarrollo/productos/id/foto.png"
it("deriva entrega acotada sin cambiar version/public ID ni original", () => {
  expect(deliveryCloudinary({ src: original, width: 128 })).toBe(original.replace("/upload/", "/upload/c_limit,w_128/q_auto/f_auto/"))
  expect(deliveryCloudinary({ src: original, width: 99999 })).toContain("w_1920/")
  expect(deliveryCloudinary({ src: original, width: 110 })).toContain("w_128/")
})
it.each(["http://res.cloudinary.com/a/image/upload/v1/a.png", "https://res.cloudinary.com.evil.test/a/image/upload/v1/a.png", "https://res.cloudinary.com/a/image/fetch/v1/a.png", original + "?w=99999", original + "#x", original.replace("https://", "https://clave@"), original.replace("v123/", "w_99999/"), "javascript:alert(1)"])("no transforma entradas no confiables: %s", src => {
  expect(urlCloudinaryVersionada(src)).toBeNull()
  expect(() => deliveryCloudinary({ src, width: 128 })).toThrow()
})
it("rechaza esquemas/credenciales inseguros y conserva HTTPS historico sin proxy", () => {
  expect(urlImagenSegura("https://example.test/foto.png")).toBe(true)
  expect(urlImagenSegura("javascript:alert(1)")).toBe(false)
  expect(urlImagenSegura("https://clave@example.test/foto.png")).toBe(false)
  expect(() => deliveryCloudinary({ src: original, width: NaN })).toThrow()
})
