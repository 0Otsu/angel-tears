import { act, fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, expect, it, vi } from "vitest"
import { VistaPreviaProducto } from "./vista-previa-producto"
import type { ProductoPublico } from "@/lib/modulos/catalogo/contrato"
const { consultar } = vi.hoisted(() => ({ consultar: vi.fn() }))
vi.mock("@/app/admin/(panel)/productos/vista-previa-acciones", () => ({ consultarVistaPreviaAccion: consultar }))
const producto: ProductoPublico = { id: "id", slug: "anillo-real", nombre: "Anillo real", precio: "33000.50", moneda: "ARS", categoriaCodigo: "anillos", categoriaNombre: "Anillos", descripcion: "Descripcion guardada", material: "Acero", medida: "18", color: "Dorado", cuidados: "Paño seco", disponible: false, destacado: false, imagen: { url: "https://example.test/A.png", ancho: 800, alto: 600, alt: "Anillo real" }, galeria: [{ url: "https://example.test/A.png", ancho: 800, alto: 600, alt: "Anillo real" }] }
const editar = vi.fn(), imagenes = vi.fn()
const props = { productoId: "id", version: 1, publicado: false, slug: producto.slug, editarDatos: editar, gestionarImagenes: imagenes, acciones: (listo: boolean) => <button disabled={!listo}>Publicar producto</button> }
beforeEach(() => { consultar.mockReset(); editar.mockReset(); imagenes.mockReset() })
it("representa el DTO confirmado con controles admin separados y enlace publico solo al publicar", async () => {
  let resolver!: (v: unknown) => void
  consultar.mockReturnValue(new Promise(r => { resolver = r }))
  const { rerender } = render(<VistaPreviaProducto {...props} />)
  expect((screen.getByRole("button", { name: "Publicar producto" }) as HTMLButtonElement).disabled).toBe(true)
  expect(screen.queryByRole("link", { name: /Ver producto/ })).toBeNull()
  await act(async () => resolver({ estado: "ok", version: 1, producto }))
  expect(screen.getByRole("heading", { name: "Anillo real" })).toBeTruthy()
  expect(screen.getByText("Descripcion guardada")).toBeTruthy()
  expect(screen.getByText("$33.000,50")).toBeTruthy()
  expect(screen.getByText("Sin stock")).toBeTruthy()
  expect(screen.getByText("Acero")).toBeTruthy()
  fireEvent.click(screen.getByRole("button", { name: "Editar datos" })); expect(editar).toHaveBeenCalledOnce()
  fireEvent.click(screen.getByRole("button", { name: "Gestionar imágenes" })); expect(imagenes).toHaveBeenCalledOnce()
  rerender(<VistaPreviaProducto {...props} publicado />)
  const enlace = screen.getByRole("link", { name: "Ver producto (abre otra pestaña)" })
  expect(enlace.getAttribute("href")).toBe("/catalogo/anillo-real")
  expect(enlace.getAttribute("target")).toBe("_blank")
})
it("conflicto no adopta datos/version ajenos y mantiene publicacion bloqueada", async () => {
  consultar.mockResolvedValue({ estado: "conflicto_version" })
  render(<VistaPreviaProducto {...props} />)
  expect(await screen.findByRole("alert")).toHaveProperty("textContent", "El producto cambió desde que lo abriste.")
  expect(screen.getByRole("button", { name: "Recargar datos" })).toBeTruthy()
  expect(screen.queryByRole("region", { name: "Detalle del producto" })).toBeNull()
  expect((screen.getByRole("button", { name: "Publicar producto" }) as HTMLButtonElement).disabled).toBe(true)
})
it("respuesta tardia de una lectura anterior no reemplaza la version propia mas reciente", async () => {
  let anterior!: (v: unknown) => void
  consultar.mockImplementationOnce(() => new Promise(r => { anterior = r })).mockResolvedValueOnce({ estado: "ok", version: 2, producto: { ...producto, nombre: "Datos nuevos" } })
  const { rerender } = render(<VistaPreviaProducto {...props} />)
  rerender(<VistaPreviaProducto {...props} version={2} />)
  await screen.findByRole("heading", { name: "Datos nuevos" })
  await act(async () => anterior({ estado: "ok", version: 1, producto }))
  expect(screen.getByRole("heading", { name: "Datos nuevos" })).toBeTruthy()
  expect(screen.queryByRole("heading", { name: "Anillo real" })).toBeNull()
})
