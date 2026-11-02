import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, expect, it, vi } from "vitest"
import { EditorProducto } from "./editor-producto"
import { ProductosAdmin } from "./productos-admin"
import { AccionesProducto } from "./acciones-producto"
import type { ProductoAdministrativo } from "@/lib/modulos/productos/administracion-contrato"
const { editar, publicar, navegar, refrescar } = vi.hoisted(() => ({ editar: vi.fn(), publicar: vi.fn(), navegar: vi.fn(), refrescar: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refrescar, push: navegar }) }))
vi.mock("@/app/admin/(panel)/productos/acciones", () => ({ crearProductoAccion: vi.fn(), editarProductoAccion: editar }))
vi.mock("@/app/admin/(panel)/productos/publicacion-acciones", () => ({ cambiarPublicacionAccion: publicar }))
vi.mock("./galeria-producto", () => ({ GaleriaProducto: ({ version, alGuardar }: { version: number; alGuardar: (valor: unknown) => void }) => <button onClick={() => alGuardar({ version: version + 1, imagen: { urlSegura: "https://example.test/B.png", ancho: 20, alto: 20 } })}>Confirmar imagen de prueba</button> }))
const producto: ProductoAdministrativo = { id: "cd12704c-e5a7-4216-b16e-ad6d7ae47490", nombre: "Collar", slug: "collar", precio: "222.00", categoriaCodigo: "collares", categoriaNombre: "Collares", descripcion: null, material: null, medida: null, color: null, cuidados: null, publicado: false, destacado: false, version: 1, tieneImagen: false, imagen: null }
const categorias = [{ codigo: "collares" as const, nombre: "Collares" }]
it("publicacion pendiente bloquea solo su producto y vuelve a permitir tras error", async () => {
 let resolver!: (valor: unknown) => void
 publicar.mockImplementationOnce(() => new Promise(r => { resolver = r }))
 render(<><AccionesProducto producto={{...producto,tieneImagen:true}} finalizar /><AccionesProducto producto={{...producto,id:"otra-fila",tieneImagen:true}} finalizar /></>)
 fireEvent.click(screen.getAllByRole("button",{name:"Publicar producto"})[0])
 const pendiente = screen.getByRole("button",{name:"Publicando…"}) as HTMLButtonElement
 expect(pendiente.disabled).toBe(true)
 expect(screen.getAllByText("Publicando…")).toHaveLength(1)
 fireEvent.click(pendiente)
 expect(publicar).toHaveBeenCalledTimes(1)
 expect((screen.getByRole("button",{name:"Publicar producto"}) as HTMLButtonElement).disabled).toBe(false)
 await act(async () => resolver({estado:"error_tecnico"}))
 expect(await screen.findByRole("alert")).toBeTruthy()
 expect(screen.getAllByRole("button",{name:"Publicar producto"}).every(b => !(b as HTMLButtonElement).disabled)).toBe(true)
})
beforeEach(() => { editar.mockReset(); publicar.mockReset(); navegar.mockReset(); refrescar.mockReset() })
it("empty state prioriza CTA y no despliega formulario", () => {
  render(<ProductosAdmin consulta={{ productos: [], categorias }} />)
  expect(screen.queryByRole("form")).toBeNull()
  fireEvent.click(screen.getByRole("button", { name: "Crear primer producto" }))
  expect(navegar).toHaveBeenCalledWith("/admin/productos/nuevo")
})
it("filtra productos persistidos y distingue filtro vacio", () => {
  render(<ProductosAdmin consulta={{ productos: [producto], categorias }} />)
  fireEvent.change(screen.getByLabelText("Buscar por nombre"), { target: { value: "Aros" } })
  expect(screen.getByText(/No hay productos que coincidan/)).toBeTruthy()
  fireEvent.change(screen.getByLabelText("Buscar por nombre"), { target: { value: "Collar" } })
  expect(screen.getByRole("heading", { name: "Collar" })).toBeTruthy()
  expect(screen.getByRole("button", { name: "Acciones de Collar" })).toBeTruthy()
})
it("imagen propia actualiza version sin perder el borrador ni adoptar cambios ajenos", async () => {
  editar.mockResolvedValue({ estado: "ok", productoId: producto.id })
  render(<EditorProducto producto={producto} categorias={categorias} />)
  fireEvent.change(screen.getByLabelText("Nombre *"), { target: { value: "Borrador conservado" } })
  fireEvent.click(screen.getByRole("button", { name: "2. Imagen" }))
  fireEvent.click(screen.getByRole("button", { name: "Confirmar imagen de prueba" }))
  fireEvent.click(screen.getByRole("button", { name: "1. Datos" }))
  expect((screen.getByLabelText("Nombre *") as HTMLInputElement).value).toBe("Borrador conservado")
  fireEvent.submit(screen.getByRole("form"))
  await waitFor(() => expect(editar).toHaveBeenCalledTimes(1))
  expect(editar.mock.calls[0][0].get("version")).toBe("2")
  expect(editar.mock.calls[0][0].get("nombre")).toBe("Borrador conservado")
})
it("finalizar bloquea publicar sin imagen y usa la accion real con version tras imagen", async () => {
  publicar.mockResolvedValue({ estado: "ok", productoId: producto.id, slug: producto.slug, version: 3 })
  const { rerender } = render(<AccionesProducto producto={producto} finalizar />)
  expect((screen.getByRole("button", { name: "Publicar producto" }) as HTMLButtonElement).disabled).toBe(true)
  rerender(<AccionesProducto producto={{ ...producto, tieneImagen: true, version: 2 }} finalizar />)
  fireEvent.click(screen.getByRole("button", { name: "Publicar producto" }))
  await screen.findByText("Producto publicado.")
  expect(publicar).toHaveBeenCalledWith({ id: producto.id, version: 2, accion: "publicar" })
})

it("guardar oculto confirma el comando y navega sin competir con un refresh", async () => {
 publicar.mockResolvedValue({estado:"ok",productoId:producto.id,slug:producto.slug,version:2});
 render(<AccionesProducto producto={producto} finalizar />);
 fireEvent.click(screen.getByRole("button",{name:"Guardar como oculto"}));
 await waitFor(()=>expect(navegar).toHaveBeenCalledWith(`/admin/productos?cancelado=${producto.id}`));
 expect(publicar).toHaveBeenCalledWith({id:producto.id,version:1,accion:"ocultar"});
 expect(refrescar).not.toHaveBeenCalled();
})

it("publicar desde resumen conserva feedback al pasar a acciones de producto publicado", async () => {
 publicar.mockResolvedValue({estado:"ok",productoId:producto.id,slug:producto.slug,version:2});
 render(<EditorProducto producto={{...producto,tieneImagen:true,imagen:{urlSegura:"https://example.test/A.png",ancho:20,alto:20}}} categorias={categorias} />);
 fireEvent.click(screen.getByRole("button",{name:"3. Finalizar"}));
 fireEvent.click(screen.getByRole("button",{name:"Publicar producto"}));
 expect(await screen.findByText("Producto publicado.")).toBeTruthy();
 expect(screen.getByRole("button",{name:"Acciones de Collar"})).toBeTruthy();
 expect(screen.getByRole("button",{name:"Cancelar"})).toBeTruthy();
})

it("recuperacion contextual: error normal permite retry y solo un conflicto pide recargar", async () => {
  publicar.mockResolvedValueOnce({ estado: "error_tecnico" }).mockResolvedValueOnce({ estado: "conflicto_version" })
  render(<AccionesProducto producto={{ ...producto, tieneImagen: true }} finalizar />)
  expect(screen.queryByRole("button", { name: "Recargar datos" })).toBeNull()
  fireEvent.click(screen.getByRole("button", { name: "Publicar producto" }))
  await screen.findByRole("alert")
  expect(screen.queryByRole("button", { name: "Recargar datos" })).toBeNull()
  fireEvent.click(screen.getByRole("button", { name: "Reintentar" }))
  expect(await screen.findByText("El producto cambió desde que lo abriste.")).toBeTruthy()
  expect(screen.getByRole("button", { name: "Recargar datos" })).toBeTruthy()
  expect((screen.getByRole("button", { name: "Publicar producto" }) as HTMLButtonElement).disabled).toBe(false)
})
it("Finalizar conserva borrador y pide guardarlo antes de confirmar el estado", () => {
  render(<EditorProducto producto={{ ...producto, tieneImagen: true, imagen: { urlSegura: "https://example.test/A.png", ancho: 20, alto: 20 }, precio: "33000.50" }} categorias={categorias} />)
  fireEvent.change(screen.getByLabelText("Nombre *"), { target: { value: "Sin guardar" } })
  fireEvent.click(screen.getByRole("button", { name: "3. Finalizar" }))
  expect(screen.getByText("Tenés cambios sin guardar.")).toBeTruthy()
  expect(screen.getByText("$33.000,50")).toBeTruthy()
  expect((screen.getByRole("button", { name: "Publicar producto" }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(screen.getByRole("button", { name: "Volver a Datos" }))
  expect((screen.getByLabelText("Nombre *") as HTMLInputElement).value).toBe("Sin guardar")
  expect(publicar).not.toHaveBeenCalled()
})
it("listado aplica la confirmacion propia antes del refresh y conserva el aviso al filtrar", async () => {
  publicar.mockResolvedValue({ estado: "ok", productoId: producto.id, slug: producto.slug, version: 2 })
  render(<ProductosAdmin consulta={{ productos: [{ ...producto, tieneImagen: true, precio: "33000.00" }], categorias }} />)
  expect(screen.getByText("$33.000")).toBeTruthy()
  fireEvent.change(screen.getByLabelText("Estado"), { target: { value: "oculto" } })
  fireEvent.keyDown(screen.getByRole("button", { name: "Acciones de Collar" }), { key: "Enter", code: "Enter" })
  fireEvent.click(await screen.findByRole("menuitem", { name: "Publicar" }))
  expect(await screen.findByText("Producto publicado.")).toBeTruthy()
  expect(screen.queryByRole("heading", { name: "Collar" })).toBeNull()
  expect(screen.getByText("No hay productos que coincidan con estos filtros.")).toBeTruthy()
})
