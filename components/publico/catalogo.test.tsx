import { fireEvent, render, screen } from "@testing-library/react"
import { expect, it, vi } from "vitest"
import type { ProductoPublico } from "@/lib/modulos/catalogo/contrato"
import { Catalogo } from "./catalogo"

Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() })

const productos: ProductoPublico[] = Array.from({ length: 7 }, (_, i) => ({
  id: String(i), slug: "pieza-" + i, nombre: "Pieza " + i, precio: "12.50", moneda: "ARS",
  categoriaCodigo: "cat-" + i, categoriaNombre: "Categoría " + i, descripcion: null,
  material: null, medida: null, color: null, cuidados: null, destacado: false, disponible: true, imagen: null,
}))

it("filtra en ambos controles, identifica una categoría adicional y restablece Todos al desaparecer", async () => {
  const { rerender } = render(<Catalogo productos={productos} />)
  expect(screen.getByRole("status").textContent).toContain("7 productos disponibles")
  expect(screen.queryByRole("button", { name: "Collares" })).toBeNull()
  const mas = screen.getByRole("combobox", { name: "Más categorías" })
  fireEvent.keyDown(mas, { key: "ArrowDown" })
  fireEvent.keyDown(await screen.findByRole("option", { name: "Categoría 6" }), { key: "Enter" })
  expect(mas.textContent).toBe("Categoría 6")
  expect(screen.getByRole("status").textContent).toContain("1 producto disponible")
  expect(screen.getByRole("heading", { name: "Pieza 6" })).toBeTruthy()
  expect(screen.queryByRole("heading", { name: "Pieza 0" })).toBeNull()

  const movil = screen.getByRole("combobox", { name: "Filtrar por categoría" })
  expect(movil.textContent).toBe("Categoría 6")
  fireEvent.keyDown(movil, { key: "ArrowDown" })
  fireEvent.keyDown(await screen.findByRole("option", { name: "Categoría 5" }), { key: "Enter" })
  expect(mas.textContent).toBe("Categoría 5")

  rerender(<Catalogo productos={productos.slice(0, 5)} />)
  expect(screen.getByRole("button", { name: "Todos" }).getAttribute("aria-pressed")).toBe("true")
  expect(movil.textContent).toBe("Todas las categorías")
  expect(screen.getByRole("status").textContent).toContain("5 productos disponibles")
})
