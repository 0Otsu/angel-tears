import { fireEvent, render, screen } from "@testing-library/react"
import { expect, it } from "vitest"
import { ImagenProducto } from "./imagen-producto"
it("Cloudinary tiene srcset y thumbnail pequeno; error conserva caja y ofrece texto sin detalles", () => {
  const { rerender } = render(<div className="relative size-16"><ImagenProducto src="https://res.cloudinary.com/pruebas/image/upload/v1/foto.png" alt="Collar" fill sizes="64px" /></div>)
  const img = screen.getByAltText("Collar")
  expect(img.getAttribute("srcset")).toContain("w_128/")
  expect(img.getAttribute("loading")).toBe("lazy")
  fireEvent.error(img)
  expect(screen.getByRole("img", { name: "Collar. Imagen no disponible" }).className).toContain("inset-0")
  rerender(<ImagenProducto src="https://example.test/otra.png" alt="Detalle" width={80} height={80} />)
  expect(screen.getByAltText("Detalle").getAttribute("src")).toBe("https://example.test/otra.png")
})
