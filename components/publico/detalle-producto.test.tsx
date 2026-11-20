import { configuracionPrueba } from "@/pruebas/fixtures/configuracion-negocio"
import { proyectarNegocioPublico } from "@/lib/negocio-publico"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import type { ProductoPublico } from "@/lib/modulos/catalogo/contrato"
import { DetalleProducto } from "./detalle-producto"

const producto: ProductoPublico = {
  id: "id",
  slug: "aros-luz-y-cia",
  nombre: "Aros Luz & Cía. + ✨",
  precio: "1000.00",
  moneda: "ARS",
  categoriaCodigo: "aros-piercings",
  categoriaNombre: "Aros y piercings",
  descripcion: null,
  material: null,
  medida: null,
  color: null,
  cuidados: null,
  disponible: false,
  destacado: false,
  imagen: null,
}

const negocioPublico = proyectarNegocioPublico(configuracionPrueba)

beforeEach(() => {
  vi.stubEnv("SITE_URL", undefined)
  vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", undefined)
})

afterEach(() => vi.unstubAllEnvs())

it.each([
  { siteUrl: "https://tienda.example.test", origen: "https://tienda.example.test" },
  { siteUrl: undefined, origen: "https://angel-tears-demo.vercel.app" },
])("envía el nombre y el enlace de la ficha en $origen", ({ siteUrl, origen }) => {
  vi.stubEnv("SITE_URL", siteUrl)
  vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "angel-tears-demo.vercel.app")

  render(<DetalleProducto negocioPublico={negocioPublico} product={producto} relacionados={[]} />)

  const ficha = within(screen.getByRole("region", { name: "Detalle del producto" }))
  const enlace = ficha.getByRole<HTMLAnchorElement>("link", { name: "Consultar por WhatsApp (abre otra pestaña)" })
  const destino = new URL(enlace.href)
  expect(destino.origin + destino.pathname).toBe("https://wa.me/5491100000000")
  expect(destino.searchParams.get("text")).toBe(
    `¡Hola! 😊 Vi Aros Luz & Cía. + ✨ en el catálogo de Angel Tears y quería consultar si todavía está disponible. ¡Gracias!\n${origen}/catalogo/aros-luz-y-cia`,
  )
  expect([...destino.searchParams.keys()]).toEqual(["text"])
  expect(enlace.target).toBe("_blank")
  expect(ficha.getByRole("link", { name: "Consultar por Instagram" }).getAttribute("href")).toBe(negocioPublico.instagram)
  expect(ficha.getByText("Sin stock")).toBeTruthy()
})

it.each([undefined, "localhost:3000"])("permite consultar sin URL pública con origen de Vercel %s", (dominio) => {
  vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", dominio)
  render(<DetalleProducto negocioPublico={negocioPublico} product={producto} relacionados={[]} />)

  const ficha = within(screen.getByRole("region", { name: "Detalle del producto" }))
  const enlace = ficha.getByRole<HTMLAnchorElement>("link", { name: /Consultar por WhatsApp/ })
  const destino = new URL(enlace.href)
  expect(destino.origin + destino.pathname).toBe("https://wa.me/5491100000000")
  expect(destino.searchParams.get("text")).toBe(
    "¡Hola! 😊 Vi Aros Luz & Cía. + ✨ en el catálogo de Angel Tears y quería consultar si todavía está disponible. ¡Gracias!",
  )
  expect(ficha.getByRole("link", { name: "Consultar por Instagram" }).getAttribute("href")).toBe(negocioPublico.instagram)
})

it("muestra el acceso al final del menú móvil y lo cierra al navegar", () => {
  render(<DetalleProducto negocioPublico={negocioPublico} product={producto} relacionados={[]} />)

  const navegacion = within(screen.getByRole("navigation", { name: "Navegación principal" }))
  const menu = navegacion.getByRole("button", { name: "Abrir menú" })
  expect(navegacion.queryByRole("link", { name: "Iniciar sesión" })).toBeNull()
  fireEvent.click(menu)

  const acceso = navegacion.getByRole("link", { name: "Iniciar sesión" })
  expect(acceso.getAttribute("href")).toBe("/admin/login")
  expect(acceso.nextElementSibling).toBeNull()
  window.addEventListener("click", evento => evento.preventDefault(), { once: true })
  fireEvent.click(acceso)

  expect(menu.getAttribute("aria-expanded")).toBe("false")
  expect(navegacion.queryByRole("link", { name: "Iniciar sesión" })).toBeNull()
  expect(screen.getByRole("link", { name: "Acceder a administración" }).getAttribute("href")).toBe("/admin/login")
})
