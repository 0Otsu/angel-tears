import { render, screen, within } from "@testing-library/react"
import { expect, it } from "vitest"
import { proyectarNegocioPublico } from "@/lib/negocio-publico"
import { configuracionPrueba } from "@/pruebas/fixtures/configuracion-negocio"
import { Contacto } from "./contacto"
import { FeatureSection } from "./feature-section"
import { Footer } from "./footer"

it("muestra la configuración vigente en el local, el contacto y el pie", () => {
  const negocioPublico = proyectarNegocioPublico(configuracionPrueba)
  render(<>
    <FeatureSection negocioPublico={negocioPublico} />
    <Contacto negocioPublico={negocioPublico} />
    <Footer negocioPublico={negocioPublico} />
  </>)

  expect(screen.getAllByText(/Calle de prueba 123/)).toHaveLength(2)
  expect(screen.getByText(/Lunes, Sábado/)).toBeTruthy()
  expect(screen.getByText(/09:30 a 12:15/)).toBeTruthy()
  for (const mapa of screen.getAllByRole("link", { name: "Cómo llegar" })) {
    expect(mapa.getAttribute("href")).toBe(configuracionPrueba.comoLlegar)
  }
  const contacto = within(screen.getByRole("region", { name: "¿Tenés alguna consulta?" }))
  expect(contacto.getByRole("link", { name: "Consultar por WhatsApp" }).getAttribute("href"))
    .toBe("https://wa.me/5491100000000")
  expect(contacto.getByRole("link", { name: "Ver Instagram" }).getAttribute("href"))
    .toBe("https://www.instagram.com/accesorios.prueba/")
})
