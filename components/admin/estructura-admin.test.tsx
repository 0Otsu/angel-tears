import { render, screen, within } from "@testing-library/react"
import { beforeEach, expect, it, vi } from "vitest"
import { EstructuraAdmin } from "./estructura-admin"
const { ruta } = vi.hoisted(() => ({ ruta: { actual: "/admin" } }))
vi.mock("next/navigation", () => ({ usePathname: () => ruta.actual }))
vi.mock("./boton-cerrar-sesion", () => ({ BotonCerrarSesion: () => <button>Cerrar sesión</button> }))
beforeEach(() => { ruta.actual = "/admin" })
function montar() { render(<EstructuraAdmin nombre="Administradora" email="admin@example.test"><h1>Contenido del modulo</h1></EstructuraAdmin>) }
it("tres destinos principales, Productos concentra existencias y acceso de usuario separado", () => {
  montar(); const nav = within(screen.getByRole("navigation", { name: "Módulos administrativos" }))
  expect(nav.getAllByRole("link").map(a => a.textContent)).toEqual(["Resumen", "Productos", "Operaciones"])
  expect(nav.queryByRole("link", { name: "Inventario" })).toBeNull()
  expect(nav.queryByRole("link", { name: "Cuenta" })).toBeNull()
  expect(nav.queryByRole("link", { name: "Configuración" })).toBeNull()
  expect(screen.getByRole("button", { name: "Menú de usuario: Administradora" })).toBeTruthy()
  expect(screen.getByRole("heading", { name: "Contenido del modulo" })).toBeTruthy()
  expect(screen.queryByText("Datos de demostración · sin persistencia")).toBeNull()
})
it("encabezado horizontal único con logo existente y navegación visible, sin sidebar ni menú duplicado", () => {
  montar()
  const encabezado = screen.getByRole("banner")
  expect(within(encabezado).getByRole("navigation", { name: "Módulos administrativos" })).toBeTruthy()
  expect(encabezado.querySelector('img[alt=""]')).toBeTruthy()
  expect(screen.queryByRole("complementary")).toBeNull()
  expect(screen.queryByRole("button", { name: "Abrir navegación administrativa" })).toBeNull()
  expect(screen.getAllByRole("navigation", { name: "Módulos administrativos" })).toHaveLength(1)
})
it.each([
  ["/admin/ventas", "Operaciones", "Ventas"], ["/admin/compras", "Operaciones", "Compras"],
  ["/admin/proveedores", "Operaciones", "Proveedores"],
  ["/admin/gastos", "Operaciones", "Gastos"],
])("deep link %s activa area y destino secundario", (url, area, destino) => {
  ruta.actual = url; montar()
  expect(screen.getByRole("navigation", { name: "Módulos administrativos" }).querySelector('[aria-current]')?.textContent).toBe(area)
  const nav = screen.getByRole("navigation", { name: `Navegación de ${area}` })
  expect(within(nav).getByRole("link", { name: destino }).getAttribute("aria-current")).toBe("page")
  expect(nav.querySelectorAll('[aria-current]')).toHaveLength(1)
})
it("editor de Producto conserva su area sin navegacion secundaria ajena", () => {
  ruta.actual = "/admin/productos/123/editar"; montar()
  expect(screen.getByRole("navigation", { name: "Módulos administrativos" }).querySelector('[aria-current]')?.textContent).toBe("Productos")
  expect(screen.queryByRole("navigation", { name: /Navegación de/ })).toBeNull()
})

it.each(["/admin","/admin/finanzas","/admin/egresos","/admin/productos/123/editar"])("shell %s conserva navegación sin breadcrumb redundante",url=>{ruta.actual=url;montar();expect(screen.queryByRole("navigation",{name:"Ubicación"})).toBeNull();expect(screen.queryByText("Administración",{exact:true})).toBeNull();expect(screen.getByRole("link",{name:"Ver tienda"}).getAttribute("href")).toBe("/")})
