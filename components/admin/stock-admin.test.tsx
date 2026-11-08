import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { FilaStock } from "@/lib/modulos/inventario/administracion-contrato"
import { StockAdmin } from "./stock-admin"

const { ajustar, minimo, historial, refresh } = vi.hoisted(() => ({ ajustar: vi.fn(), minimo: vi.fn(), historial: vi.fn(), refresh: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }))
vi.mock("@/app/admin/(panel)/stock/acciones", () => ({ ajustarStockAccion: ajustar, cambiarMinimoAccion: minimo, consultarHistorialAccion: historial }))

const fila = (datos: Partial<FilaStock> & Pick<FilaStock, "productoId" | "nombre">): FilaStock => ({
  categoriaNombre: "Collares", publicado: false, saldo: 10, minimo: null, stockBajo: false, sinStock: false, ...datos,
})
const filas = [
  fila({ productoId: "p1", nombre: "Anillo", saldo: 10 }),
  fila({ productoId: "p2", nombre: "Brazalete", saldo: 3, minimo: 5, stockBajo: true }),
  fila({ productoId: "p3", nombre: "Collar", saldo: 0, minimo: 0, stockBajo: true, sinStock: true }),
]

beforeEach(() => { ajustar.mockReset(); minimo.mockReset(); historial.mockReset(); refresh.mockReset() })

describe("listado", () => {
  it.each([[0, "Sin stock", "rose"], [1, "Pocas unidades", "amber"], [3, "Pocas unidades", "amber"], [4, "Disponible", null]])("saldo %s conserva etiqueta y color semantico", (saldo, etiqueta, color) => {
    render(<StockAdmin filas={[fila({ productoId: "color", nombre: "Producto", saldo: Number(saldo) })]} />)
    const tabla = screen.getByRole("table")
    const badge = within(tabla).getByText(String(etiqueta))
    const filaVisual = within(tabla).getAllByRole("row")[1]
    if (color) {
      expect(badge.className).toContain(`text-${color}-900`)
      expect(filaVisual.className).toContain(`bg-${color}-50/30`)
      expect(within(tabla).getByText(String(saldo)).className).toContain(`text-${color}-900`)
      expect(badge.querySelector('svg[aria-hidden="true"]')).toBeTruthy()
    } else {
      expect(badge.className).toContain("text-primary")
      expect(filaVisual.className).not.toMatch(/bg-(rose|amber)/)
    }
  })
  it("muestra saldo y estados generales sin interfaces de minimo individual", () => {
    render(<StockAdmin filas={filas} />)
    const items = within(screen.getByRole("table", { name: "Inventario por producto" })).getAllByRole("row").slice(1).sort((a,b)=>filas.findIndex(f=>a.textContent?.includes(f.nombre))-filas.findIndex(f=>b.textContent?.includes(f.nombre)))
    expect(items).toHaveLength(3)
    expect(within(items[0]).getByText("Disponible")).toBeTruthy()
    expect(within(items[1]).getByText("Pocas unidades")).toBeTruthy()
    expect(within(items[2]).getByText("Sin stock")).toBeTruthy()
    expect(within(items[0]).queryByText("Pocas unidades")).toBeNull()
  })

  it("filtra por nombre y por estado, e informa cuando no hay coincidencias", () => {
    render(<StockAdmin filas={filas} />)
    fireEvent.change(screen.getByLabelText("Estado"), { target: { value: "pocas" } })
    expect(screen.getByRole("status").textContent).toBe("1 producto")
    fireEvent.change(screen.getByLabelText("Estado"), { target: { value: "sin_stock" } })
    expect(screen.getByRole("status").textContent).toBe("1 producto")
    fireEvent.change(screen.getByLabelText("Buscar por nombre"), { target: { value: "zzz" } })
    expect(screen.getByText("No hay productos que coincidan con estos filtros.")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }))
    fireEvent.change(screen.getByLabelText("Estado"), { target: { value: "disponible" } })
    expect(screen.getByRole("status").textContent).toBe("1 producto")
    expect(screen.getByRole("heading", { name: "Anillo" })).toBeTruthy()
    expect(screen.queryByRole("heading", { name: "Brazalete" })).toBeNull()
    expect(screen.queryByRole("heading", { name: "Collar" })).toBeNull()
  })

  it("conserva la semantica de tabla y una sola accion principal, aun con textos largos", () => {
    render(<StockAdmin filas={[{ ...filas[0], nombre: "Producto".repeat(30) }]} />)
    const tabla = screen.getByRole("table", { name: "Inventario por producto" })
    expect(within(tabla).getAllByRole("columnheader").map(h => h.textContent)).toEqual(["Producto", "Existencias", "Estado", "Acciones"])
    expect(within(tabla).getAllByRole("button", { name: /Modificar stock de/ })).toHaveLength(1)
    expect(within(tabla).getByText("Disponible")).toBeTruthy()
    expect(within(tabla).getByText("10").className).toContain("text-2xl")
    expect(within(tabla).getAllByRole("row")[1].className).toContain("md:table-row")
  })

  it("muestra estado vacio y error de carga con reintento", () => {
    const { unmount } = render(<StockAdmin filas={[]} />)
    expect(screen.getByText("Todavía no hay productos con inventario")).toBeTruthy()
    unmount()
    render(<StockAdmin filas={[]} errorCarga />)
    expect(screen.getByRole("alert").textContent).toContain("No pudimos consultar el inventario")
    expect(screen.getByRole("link", { name: "Reintentar consulta" }).getAttribute("href")).toBe("/admin/stock")
  })
})

describe("ajustar stock", () => {
  function abrir() {
    render(<StockAdmin filas={filas} />)
    fireEvent.click(screen.getByRole("button", { name: "Modificar stock de Anillo" }))
    return screen.getByRole("dialog")
  }
  const completar = (cantidad: string, motivo: string) => {
    fireEvent.change(screen.getByLabelText("Cantidad *"), { target: { value: cantidad } })
    fireEvent.change(screen.getByLabelText("Motivo *"), { target: { value: motivo } })
  }

  it("envia producto, tipo, cantidad, motivo y una clave de solicitud, y refresca", async () => {
    ajustar.mockResolvedValue({ estado: "ok", saldoResultante: 15, repetido: false })
    abrir(); completar("5", "Recuento")
    fireEvent.submit(screen.getByRole("form", { name: "Ajustar stock" }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(ajustar).toHaveBeenCalledWith({ productoId: "p1", tipo: "INCREMENTO", cantidad: "5", motivo: "Recuento", claveSolicitud: expect.stringMatching(/^[0-9a-f-]{36}$/) })
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(screen.getByText(/Stock de Anillo: 15/)).toBeTruthy()
  })

  it("estima al escribir cantidad sin motivo ni llamada al servidor", () => {
    const dialogo=abrir()
    expect(within(dialogo).getByText("Así quedará el stock")).toBeTruthy()
    fireEvent.change(screen.getByLabelText("Cantidad *"),{target:{value:"4"}})
    expect((screen.getByLabelText("Motivo *") as HTMLTextAreaElement).value).toBe("")
    expect(within(dialogo).getByRole("status").textContent).toContain("14 unidades")
    fireEvent.click(screen.getByRole("radio",{name:"Retirar"}))
    expect(within(dialogo).getByRole("status").textContent).toContain("6 unidades")
    expect(ajustar).not.toHaveBeenCalled()
  })

  it("confirma el saldo del servidor aunque difiera de la vista previa y refresca el listado", async () => {
    let resolver!: (valor: unknown) => void
    ajustar.mockImplementation(() => new Promise(r => { resolver = r }))
    const { rerender } = render(<StockAdmin filas={[filas[0]]} />)
    fireEvent.click(screen.getByRole("button", { name: "Modificar stock de Anillo" }))
    completar("5", "Recuento")
    expect(within(screen.getByRole("dialog")).getByRole("status").textContent).toContain("15 unidades")
    fireEvent.submit(screen.getByRole("form", { name: "Ajustar stock" }))
    expect(screen.queryByText(/Stock de Anillo:/)).toBeNull()
    expect(refresh).not.toHaveBeenCalled()
    // Otro movimiento redujo el saldo antes del lock; el ajuste confirma 12, no 15.
    await act(async () => resolver({ estado: "ok", saldoResultante: 12, repetido: false }))
    expect(screen.getByText("Stock de Anillo: 12 unidades.")).toBeTruthy()
    expect(screen.queryByText("Stock de Anillo: 15 unidades.")).toBeNull()
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(refresh).toHaveBeenCalledTimes(1)
    // Simula la nueva lectura RSC solicitada por router.refresh, sin estado optimista.
    rerender(<StockAdmin filas={[{ ...filas[0], saldo: 12 }]} />)
    expect(within(screen.getByRole("table")).getByText("12")).toBeTruthy()
  })

  it.each([["INCREMENTO", 15], ["DECREMENTO", 5]])("estima %s reutilizando reglas sin modificar datos", (tipo, esperado) => {
    const dialogo = abrir(); completar("5", "Recuento")
    fireEvent.click(screen.getByRole("radio", {name:tipo === "DECREMENTO" ? "Retirar" : "Agregar"}))
    expect(within(dialogo).getByRole("status").textContent).toContain(`${esperado} unidades`)
    expect(ajustar).not.toHaveBeenCalled()

  })

  it("no muestra errores mientras se escribe; conserva servidor como autoridad ante saldo insuficiente", () => {
    const dialogo = abrir()
    completar("", "")
    expect(within(dialogo).queryByRole("alert")).toBeNull()
    completar("12", "Rotura")
    fireEvent.click(screen.getByRole("radio", {name:"Retirar"}))
    expect(within(dialogo).getByRole("status").textContent).toContain("no alcanza")
    expect(within(dialogo).queryByRole("alert")).toBeNull()
    expect((screen.getByRole("button", { name: "Registrar ajuste" }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.submit(screen.getByRole("form", {name:"Ajustar stock"}))
    expect(ajustar).not.toHaveBeenCalled()
  })

  it("motivo requerido llega a validacion existente, conserva cantidad y asocia el error", async () => {
    ajustar.mockResolvedValue({ estado: "datos_invalidos", errores: { motivo: "Indicá el motivo del ajuste." } })
    abrir(); completar("5", "")
    fireEvent.submit(screen.getByRole("form", { name: "Ajustar stock" }))
    const error = await screen.findByText("Indicá el motivo del ajuste.")
    const motivo = screen.getByLabelText("Motivo *")
    await waitFor(() => expect(document.activeElement).toBe(motivo))
    expect(motivo.getAttribute("aria-describedby")).toBe(error.id)
    expect((screen.getByLabelText("Cantidad *") as HTMLInputElement).value).toBe("5")
  })

  it("bloquea doble envio y cierre mientras espera, sin cambiar la clave de solicitud", async () => {
    let resolver!: (valor: unknown) => void
    ajustar.mockImplementation(() => new Promise(r => { resolver = r }))
    abrir(); completar("5", "Recuento")
    const form = screen.getByRole("form", { name: "Ajustar stock" })
    fireEvent.submit(form); fireEvent.submit(form)
    expect(ajustar).toHaveBeenCalledTimes(1)
    expect((screen.getByRole("button", { name: "Guardando…" }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole("button", { name: "Cancelar" }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape", code: "Escape" })
    expect(screen.getByRole("dialog")).toBeTruthy()
    await act(async () => resolver({ estado: "error_tecnico" }))
    expect((screen.getByLabelText("Motivo *") as HTMLTextAreaElement).value).toBe("Recuento")
  })

  it("Escape devuelve el foco a Modificar stock sin enviar una operacion", async () => {
    const dialogo = abrir()
    fireEvent.keyDown(dialogo, { key: "Escape", code: "Escape" })
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Modificar stock de Anillo" })))
    expect(ajustar).not.toHaveBeenCalled()
  })

  it("muestra errores por campo, enfoca el primero y conserva lo escrito", async () => {
    ajustar.mockResolvedValue({ estado: "datos_invalidos", errores: { cantidad: "Ingresá una cantidad entera mayor a cero." } })
    abrir(); completar("0", "Recuento")
    fireEvent.submit(screen.getByRole("form", { name: "Ajustar stock" }))
    await screen.findByText("Ingresá una cantidad entera mayor a cero.")
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText("Cantidad *")))
    expect((screen.getByLabelText("Motivo *") as HTMLTextAreaElement).value).toBe("Recuento")
    expect(refresh).not.toHaveBeenCalled()
  })

  it("informa stock insuficiente con el disponible", async () => {
    ajustar.mockResolvedValue({ estado: "stock_insuficiente", disponible: 2, requerido: 5 })
    abrir(); completar("5", "Rotura")
    fireEvent.click(screen.getByRole("radio", {name:"Retirar"}))
    fireEvent.submit(screen.getByRole("form", { name: "Ajustar stock" }))
    expect((await screen.findByRole("alert")).textContent).toContain("hay 2 y querés restar 5")
    expect(screen.getByRole("dialog")).toBeTruthy()
    expect(refresh).not.toHaveBeenCalled()
    expect(screen.queryByText(/Stock de Anillo:/)).toBeNull()
  })

  it("tras un error tecnico conserva los datos y reintenta con la misma clave", async () => {
    ajustar.mockResolvedValueOnce({ estado: "error_tecnico" }).mockResolvedValueOnce({ estado: "ok", saldoResultante: 15, repetido: true })
    abrir(); completar("5", "Recuento")
    fireEvent.submit(screen.getByRole("form", { name: "Ajustar stock" }))
    await screen.findByText(/Conservamos tus datos/)
    fireEvent.submit(screen.getByRole("form", { name: "Ajustar stock" }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(ajustar.mock.calls[1][0].claveSolicitud).toBe(ajustar.mock.calls[0][0].claveSolicitud)
  })

  it("ofrece volver a iniciar sesion cuando la sesion vencio", async () => {
    ajustar.mockResolvedValue({ estado: "sesion_requerida" })
    abrir(); completar("5", "Recuento")
    fireEvent.submit(screen.getByRole("form", { name: "Ajustar stock" }))
    await screen.findByRole("link", { name: "Iniciar sesión" })
  })
})

it("menu conserva solo Historial y no permite cambiar minimos historicos",async()=>{
 render(<StockAdmin filas={filas}/>);
 fireEvent.keyDown(screen.getByRole("button",{name:"Más acciones de Anillo"}),{key:"Enter",code:"Enter"})
 expect(await screen.findByRole("menuitem",{name:"Historial"})).toBeTruthy()
 expect(screen.getAllByRole("menuitem")).toHaveLength(1)
 expect(screen.queryByText(/Configurar mínimo|Sin mínimo|Alerta de mínimo/)).toBeNull()
 expect(minimo).not.toHaveBeenCalled()
})

describe("historial", () => {
  it("menu abre con teclado, Escape cierra dialogo/menu y devuelve foco",async()=>{
    historial.mockResolvedValue({estado:"ok",movimientos:[]})
    render(<StockAdmin filas={filas}/>);
    await abrirSecundaria("Anillo","Historial")
    const dialogo=await screen.findByRole("dialog")
    await screen.findByText("Este producto todavía no tiene movimientos.")
    fireEvent.keyDown(dialogo,{key:"Escape",code:"Escape"})
    await waitFor(()=>expect(screen.queryByRole("dialog")).toBeNull())
    await waitFor(()=>expect(screen.queryByRole("menu")).toBeNull())
    await waitFor(()=>expect(document.activeElement).toBe(screen.getByRole("button",{name:"Más acciones de Anillo"})))
  })
  it("carga y muestra los movimientos con motivo, actor y saldo", async () => {
    historial.mockResolvedValue({ estado: "ok", movimientos: [{ id: "m1", delta: -2, saldoResultante: 8, tipo: "ORIGINAL", tipoAjuste: "DECREMENTO", motivo: "Rotura", actor: "Ana", creadoEn: "2026-11-02T15:00:00.000Z" }] })
    render(<StockAdmin filas={filas} />)
    await abrirSecundaria("Anillo","Historial")
    expect(await screen.findByText("Rotura")).toBeTruthy()
    expect(historial).toHaveBeenCalledWith("p1")
    expect(screen.getByText(/Stock resultante: 8 · Ana/)).toBeTruthy()
  })

  it("muestra vacio y permite reintentar tras un error", async () => {
    historial.mockResolvedValueOnce({ estado: "error_tecnico" }).mockResolvedValueOnce({ estado: "ok", movimientos: [] })
    render(<StockAdmin filas={filas} />)
    await abrirSecundaria("Anillo","Historial")
    fireEvent.click(await screen.findByRole("button", { name: "Reintentar" }))
    expect(await screen.findByText("Este producto todavía no tiene movimientos.")).toBeTruthy()
  })
})

async function abrirSecundaria(nombre: string, accion: string) {
 fireEvent.keyDown(screen.getByRole("button",{name:`Más acciones de ${nombre}`}),{key:"Enter",code:"Enter"});
 fireEvent.click(await screen.findByRole("menuitem",{name:accion}));
}
