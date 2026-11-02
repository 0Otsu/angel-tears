import { fireEvent, render, screen } from "@testing-library/react"
import { expect, it } from "vitest"
import { GaleriaPublica } from "./galeria-publica"
it("inicia con principal, permite seleccionar por teclado/boton y no desborda con galeria vacia", () => {
  const a = { url: "https://example.test/A.png", alt: "Frente", ancho: 100, alto: 100 }, b = { ...a, url: "https://example.test/B.png", alt: "Detalle" }
  const { rerender } = render(<GaleriaPublica principal={a} medios={[a, b]} />)
  expect(screen.getByAltText("Frente")).toBeTruthy()
  const boton = screen.getByRole("button", { name: "Ver imagen 2" }); boton.focus(); expect(document.activeElement).toBe(boton)
  fireEvent.click(boton); expect(screen.getByAltText("Detalle")).toBeTruthy(); expect(boton.getAttribute("aria-pressed")).toBe("true")
  rerender(<GaleriaPublica principal={null} medios={[]} />); expect(screen.getByText("Imagen no disponible")).toBeTruthy()
})
