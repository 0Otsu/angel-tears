import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NuevoProducto, EditorProducto } from "./editor-producto"
import { ProductosAdmin } from "./productos-admin"
import type { ConsultaAdministrativa, ResultadoGuardarProducto } from "@/lib/modulos/productos/administracion-contrato"
import { FormularioProducto } from "./formulario-producto"
import { esquemaProductoAdministrativo, erroresProducto } from "@/lib/modulos/productos/validacion-administrativa"

const { crear, editar, refresh, push } = vi.hoisted(() => ({ crear: vi.fn(), editar: vi.fn(), refresh: vi.fn(), push: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push }) }))
vi.mock("@/app/admin/(panel)/productos/acciones", () => ({ crearProductoAccion: crear, editarProductoAccion: editar }))

const consulta: ConsultaAdministrativa = {
  categorias: [{ codigo: "collares", nombre: "Collares" }],
  productos: [{ id: "cd12704c-e5a7-4216-b16e-ad6d7ae47490", nombre: "Collar real", slug: "collar-real", precio: "1500.50", categoriaCodigo: "collares", categoriaNombre: "Collares", descripcion: "Descripción", material: null, medida: null, color: null, cuidados: null, publicado: false, destacado: false, version: 1, tieneImagen: false, imagen: null }],
}
const nombre = () => screen.getByLabelText("Nombre *") as HTMLInputElement
const precio = () => screen.getByLabelText("Precio de venta (ARS) *") as HTMLInputElement
const enviar = () => fireEvent.submit(screen.getByRole("form"))
function completar() {
  fireEvent.change(nombre(), { target: { value: "Pulsera de muestra" } })
  fireEvent.change(precio(), { target: { value: "90071992547409.93" } })
  fireEvent.change(screen.getByLabelText("Categoría *"), { target: { value: "collares" } })
}
beforeEach(() => { crear.mockReset(); editar.mockReset(); refresh.mockReset(); push.mockReset() })

function servidorConValidacionActual() {
  crear.mockImplementation(async (datos: FormData) => {
    const r = esquemaProductoAdministrativo.safeParse(Object.fromEntries(datos))
    return r.success ? { estado: "ok", productoId: "nuevo" } : { estado: "datos_invalidos", errores: erroresProducto(r.error) }
  })
}

it("labels persisten al escribir, ejemplos no los sustituyen y textos largos son textarea", () => {
  render(<NuevoProducto categorias={consulta.categorias} />)
  expect(nombre().required).toBe(true); expect(precio().required).toBe(true)
  expect((screen.getByLabelText("Categoría *") as HTMLSelectElement).required).toBe(true)
  expect(precio().inputMode).toBe("decimal")
  expect(precio().placeholder).toBe("Ej: 33000")
  fireEvent.change(nombre(), { target: { value: "Pulsera Olivia" } })
  expect(screen.getByText("Nombre *").getAttribute("for")).toBe(nombre().id)
  expect(screen.getByLabelText("Descripción").tagName).toBe("TEXTAREA")
  expect(screen.getByLabelText("Cuidados").tagName).toBe("TEXTAREA")
  expect(screen.queryByText(/Hasta dos decimales, con punto/)).toBeNull()
  expect(precio().getAttribute("aria-describedby")).toBeNull()
})

it.each([
  ["33000", "33000.00"], ["33000,50", "33000.50"], ["33000.50", "33000.50"],
  ["90071992547409,93", "90071992547409.93"], ["9999999999999999,99", "9999999999999999.99"],
])("entrada %s llega exacta al servidor como %s", async (entrada, esperado) => {
  servidorConValidacionActual()
  render(<NuevoProducto categorias={consulta.categorias} />)
  completar(); fireEvent.change(precio(), { target: { value: entrada } }); enviar()
  await waitFor(() => expect(push).toHaveBeenCalled())
  expect(crear.mock.calls[0][0].get("precio")).toBe(esperado)
})

it.each([
  ["", "Ingresá un precio de venta."], ["0", "Ingresá un precio mayor a $0."],
  ["-1,50", "Ingresá un precio mayor a $0."], ["33000,555", "El precio admite hasta dos decimales."],
  ["33000.555", "El precio admite hasta dos decimales."],
  ["10000000000000000", "El precio es demasiado alto. Ingresá un importe menor."],
  ["33.000,50", "Ingresá un precio válido, por ejemplo 33000 o 33000,50."],
  ["1e3", "Ingresá un precio válido, por ejemplo 33000 o 33000,50."],
])("entrada invalida %s conserva valor y muestra correccion contextual", async (entrada, mensaje) => {
  servidorConValidacionActual()
  render(<NuevoProducto categorias={consulta.categorias} />)
  completar(); fireEvent.change(precio(), { target: { value: entrada } }); enviar()
  const error = await screen.findByText(mensaje)
  await waitFor(() => expect(document.activeElement).toBe(precio()))
  expect(precio().getAttribute("aria-describedby")).toBe(error.id)
  expect(precio().getAttribute("aria-invalid")).toBe("true")
  expect(precio().value).toBe(entrada); expect(push).not.toHaveBeenCalled()
})

it("edicion comunica decimal normalizado al editor sin dejar un borrador falso", async () => {
  editar.mockResolvedValue({ estado: "ok", productoId: consulta.productos[0].id })
  const alGuardar = vi.fn(), alCambiarBorrador = vi.fn()
  render(<FormularioProducto producto={consulta.productos[0]} categorias={consulta.categorias} cancelar={vi.fn()} alGuardar={alGuardar} alCambiarBorrador={alCambiarBorrador} />)
  fireEvent.change(precio(), { target: { value: "33000,50" } }); enviar()
  await waitFor(() => expect(alGuardar).toHaveBeenCalled())
  expect(alGuardar.mock.calls[0][1].precio).toBe("33000.50")
  expect(alCambiarBorrador).toHaveBeenLastCalledWith(false)
  expect(precio().value).toBe("33000,50")
})

describe("productos administrativos", () => {
  it("lista los registros recibidos, incluidos ocultos, y diferencia error de consulta de lista vacia", () => {
    const { rerender } = render(<ProductosAdmin consulta={consulta} />)
    expect(screen.getByText("Collar real")).toBeTruthy()
    expect(screen.getAllByText("Oculto").length).toBeGreaterThan(0)
    expect(screen.queryByText(/Aros Luna/)).toBeNull()
    rerender(<ProductosAdmin consulta={{ categorias: [], productos: [] }} errorCarga />)
    expect(screen.getByRole("alert").textContent).toContain("No pudimos consultar")
    expect(screen.queryByText("Todavía no hay productos registrados.")).toBeNull()
  })

  it("envia precio exacto, bloquea doble envio y navega tras el alta confirmada", async () => {
    let resolver!: (resultado: ResultadoGuardarProducto) => void
    crear.mockReturnValue(new Promise<ResultadoGuardarProducto>((r) => { resolver = r }))
    render(<NuevoProducto categorias={consulta.categorias} />)
    completar()
    enviar()
    expect((screen.getByRole("button", { name: "Guardando…" }) as HTMLButtonElement).disabled).toBe(true)
    enviar()
    expect(crear).toHaveBeenCalledTimes(1)
    expect((crear.mock.calls[0][0] as FormData).get("precio")).toBe("90071992547409.93")
    await act(async () => resolver({ estado: "ok", productoId: "nuevo" }))
    expect(await screen.findByRole("status")).toBeTruthy()
    expect(push).toHaveBeenCalledWith("/admin/productos/nuevo/editar?paso=imagen&alta=1")
    expect(refresh).not.toHaveBeenCalled()
  })

  it("muestra errores de servidor, conserva entradas y lleva el foco al campo invalido", async () => {
    crear.mockResolvedValue({ estado: "datos_invalidos", errores: { precio: "El precio debe ser mayor que cero." } })
    render(<NuevoProducto categorias={consulta.categorias} />)
    completar()
    fireEvent.change(precio(), { target: { value: "0" } })
    enviar()
    expect(await screen.findByText("Ingresá un precio mayor a $0.")).toBeTruthy()
    await waitFor(() => expect(document.activeElement).toBe(precio()))
    expect(precio().getAttribute("aria-invalid")).toBe("true")
    expect(nombre().value).toBe("Pulsera de muestra")
    expect(refresh).not.toHaveBeenCalled()
  })

  it.each(["sesion_requerida", "error_tecnico", "conflicto_version"] as const)("conserva el formulario ante %s", async (estado) => {
    crear.mockResolvedValue({ estado })
    render(<NuevoProducto categorias={consulta.categorias} />)
    completar()
    enviar()
    expect(await screen.findByRole("alert")).toBeTruthy()
    expect(nombre().value).toBe("Pulsera de muestra")
    expect(precio().value).toBe("90071992547409.93")
    expect(refresh).not.toHaveBeenCalled()
    if (estado === "sesion_requerida") expect(screen.getByRole("link", { name: "Iniciar sesión" }).getAttribute("href")).toBe("/admin/login")
  })

  it("una actualizacion ajena no renueva la version del borrador abierto", async () => {
 editar.mockResolvedValue({estado:"conflicto_version"});
 const {rerender}=render(<EditorProducto producto={consulta.productos[0]} categorias={consulta.categorias} />);
 fireEvent.change(nombre(),{target:{value:"Mi edición"}});
 rerender(<EditorProducto producto={{...consulta.productos[0],version:2,nombre:"Cambio ajeno"}} categorias={consulta.categorias} />);
 enviar();await screen.findByRole("alert");
 expect(editar.mock.calls[0][0].get("version")).toBe("1");expect(editar.mock.calls[0][0].get("nombre")).toBe("Mi edición");
 })

  it("sin categorias muestra la preparacion pendiente y no permite crear", () => {
    render(<NuevoProducto categorias={[]} />)
    expect(screen.getByRole("form")).toBeTruthy()
    expect((screen.getByRole("button", { name: "Guardar y continuar" }) as HTMLButtonElement).disabled).toBe(true)
  })
})
