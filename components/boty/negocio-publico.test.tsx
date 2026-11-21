import { render, screen, within } from "@testing-library/react"
import { expect, it } from "vitest"
import { proyectarNegocioPublico } from "@/lib/negocio-publico"
import { configuracionPrueba } from "@/pruebas/fixtures/configuracion-negocio"
import { Contacto } from "./contacto"
import { FeatureSection } from "./feature-section"
import { Footer } from "./footer"
import { Hero } from "./hero"

it("muestra la configuración vigente en el local, el contacto y el pie", () => {
  const negocioPublico = proyectarNegocioPublico(configuracionPrueba)
  render(<>
    <FeatureSection negocioPublico={negocioPublico} />
    <Contacto negocioPublico={negocioPublico} />
    <Footer negocioPublico={negocioPublico} />
  </>)

  expect(screen.getAllByText(/Calle de prueba 123/)).toHaveLength(2)
  expect(screen.getByText("Lunes, Sábado: 09:30 a 12:15 · 16:00 a 20:00")).toBeTruthy()
  expect(screen.getByText("Martes a viernes, Domingo: Cerrado")).toBeTruthy()
  const local = within(screen.getByRole("region", { name: "Vení a conocer Angel Tears" }))
  expect(local.queryByRole("img")).toBeNull()
  expect(local.getByRole("link", { name: "Cómo llegar" }).getAttribute("href"))
    .toBe(configuracionPrueba.comoLlegar)
  const contacto = within(screen.getByRole("region", { name: "¿Tenés alguna consulta?" }))
  expect(contacto.getByRole("link", { name: "Consultar por WhatsApp" }).getAttribute("href"))
    .toBe("https://wa.me/5491100000000")
  expect(contacto.getByRole("link", { name: "Ver Instagram" }).getAttribute("href"))
    .toBe("https://www.instagram.com/accesorios.prueba/")
})

it("conserva el acceso al catálogo cuando falta la foto del hero", () => {
  const { rerender } = render(<Hero />)

  const hero = within(screen.getByRole("region", { name: /Accesorios que acompañan cada versión de vos/ }))
  expect(hero.getByRole("link", { name: "Ver catálogo" }).getAttribute("href")).toBe("/catalogo")
  expect(hero.queryByRole("img", { hidden: true })).toBeNull()

  rerender(<Hero foto={{ src: "/hero-prueba.webp", width: 1920, height: 1080 }} />)
  const fondo = screen.getByRole("region", { name: /Accesorios que acompañan cada versión de vos/ })
  expect(fondo.querySelector("img")?.classList.contains("object-cover")).toBe(true)
  expect(fondo.querySelector("img")?.getAttribute("sizes")).toBe("100vw")
  const capas = fondo.querySelectorAll("[aria-hidden=true] > div")
  expect(capas).toHaveLength(1)
  expect(capas[0].classList.contains("bottom-0")).toBe(true)
  expect(capas[0].classList.contains("from-card")).toBe(true)
  expect(within(fondo).getByRole("link", { name: "Ver catálogo" })).toBeTruthy()
})

it("muestra el interior opcional con su texto alternativo", () => {
  const negocioPublico = proyectarNegocioPublico(configuracionPrueba)
  const fotoLocal = {
    src: { src: "/images/local/interior-prueba.webp", width: 1280, height: 960 },
    alt: "Interior de prueba del local",
  }
  render(<FeatureSection negocioPublico={negocioPublico} fotoLocal={fotoLocal} />)

  const local = within(screen.getByRole("region", { name: "Vení a conocer Angel Tears" }))
  expect(local.getByRole("img", { name: fotoLocal.alt })).toBeTruthy()
  expect(local.getByRole("link", { name: "Cómo llegar" }).getAttribute("href")).toBe(negocioPublico.comoLlegar)
})
