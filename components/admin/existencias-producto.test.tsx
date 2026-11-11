import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, expect, it, vi } from "vitest"
import { ExistenciasProducto } from "./existencias-producto"
import type { FilaStock } from "@/lib/modulos/inventario/administracion-contrato"
const { ajustar, historial, refresh } = vi.hoisted(() => ({ ajustar: vi.fn(), historial: vi.fn(), refresh: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }))
vi.mock("@/app/admin/(panel)/stock/acciones", () => ({ ajustarStockAccion: ajustar, consultarHistorialAccion: historial }))
const fila: FilaStock = { productoId: "cd12704c-e5a7-4216-b16e-ad6d7ae47490", nombre: "Anillo", saldo: 4, minimo: 100, stockBajo: false, sinStock: false, publicado: true, categoriaNombre: "Anillos" }
beforeEach(() => vi.clearAllMocks())
it.each([[0,"Sin stock"],[1,"Pocas unidades"],[2,"Pocas unidades"],[3,"Pocas unidades"],[4,"Disponible"],[20,"Disponible"]])("existencias %s usa estado %s sin minimo individual",(saldo,etiqueta)=>{
 render(<ExistenciasProducto fila={{...fila,saldo:Number(saldo)}} />)
 expect(screen.getByRole("region",{name:"Existencias"}).textContent).toContain(String(saldo))
 expect(screen.getByText(etiqueta)).toBeTruthy()
 expect(screen.queryByText(/Configurar mínimo|Mínimo:/)).toBeNull()
})
function abrir(){fireEvent.click(screen.getByRole("button",{name:"Modificar stock de Anillo"}));return screen.getByRole("dialog")}
function completar(cantidad="2"){fireEvent.change(screen.getByLabelText("Cantidad *"),{target:{value:cantidad}});fireEvent.change(screen.getByLabelText("Motivo *"),{target:{value:"Recuento"}})}
it("usa la Action existente y muestra saldo confirmado distinto de la estimacion; una lectura nueva prevalece",async()=>{
 let resolver!:(r:unknown)=>void;ajustar.mockImplementationOnce(()=>new Promise(r=>{resolver=r}))
 const {rerender}=render(<ExistenciasProducto fila={fila}/>);abrir();completar()
 expect(screen.getByRole("status").textContent).toContain("6 unidades")
 fireEvent.submit(screen.getByRole("form",{name:"Ajustar stock"}));fireEvent.submit(screen.getByRole("form",{name:"Ajustar stock"}))
 expect(ajustar).toHaveBeenCalledTimes(1)
 await act(async()=>resolver({estado:"ok",saldoResultante:5,repetido:false}))
 expect(screen.getByText("Stock de Anillo: 5 unidades.")).toBeTruthy()
 expect(document.querySelector("#existencias strong")?.textContent).toBe("5")
 expect(refresh).toHaveBeenCalledOnce()
 rerender(<ExistenciasProducto fila={{...fila,saldo:3}}/>);
 expect(document.querySelector("#existencias strong")?.textContent).toBe("3")
 expect(screen.getByText("Pocas unidades")).toBeTruthy()
})
it("retiro superior se bloquea; un rechazo concurrente conserva formulario sin inventar saldo",async()=>{
 ajustar.mockResolvedValueOnce({estado:"stock_insuficiente",disponible:1,requerido:2})
 render(<ExistenciasProducto fila={fila}/>);abrir();fireEvent.click(screen.getByLabelText("Retirar"));completar("5")
 expect((screen.getByRole("button",{name:"Registrar ajuste"}) as HTMLButtonElement).disabled).toBe(true)
 expect(ajustar).not.toHaveBeenCalled()
 completar("2");fireEvent.submit(screen.getByRole("form"));await screen.findByText("No alcanza el stock: hay 1 y querés restar 2.")
 expect(screen.getByRole("dialog")).toBeTruthy();expect(refresh).not.toHaveBeenCalled()
 expect((screen.getByLabelText("Motivo *") as HTMLInputElement).value).toBe("Recuento")
})
it("reintento tras error conserva la clave de idempotencia y el saldo previo hasta confirmar",async()=>{
 ajustar.mockResolvedValueOnce({estado:"error_tecnico"}).mockResolvedValueOnce({estado:"ok",saldoResultante:6,repetido:true})
 render(<ExistenciasProducto fila={fila}/>);abrir();completar();fireEvent.submit(screen.getByRole("form"));await screen.findByRole("alert")
 expect(document.querySelector("#existencias strong")?.textContent).toBe("4")
 fireEvent.submit(screen.getByRole("form"));await waitFor(()=>expect(screen.queryByRole("dialog")).toBeNull())
 expect(ajustar.mock.calls[0][0].claveSolicitud).toBe(ajustar.mock.calls[1][0].claveSolicitud)
})
it("consulta historial existente sin guardar datos comerciales",async()=>{
 historial.mockResolvedValueOnce({estado:"ok",movimientos:[{id:"m",delta:2,saldoResultante:4,tipo:"ORIGINAL",tipoAjuste:"INCREMENTO",motivo:"Recuento",actor:"Administradora",creadoEn:"2026-11-11T12:00:00Z"}]})
 render(<ExistenciasProducto fila={fila}/>);fireEvent.click(screen.getByRole("button",{name:"Ver historial de Anillo"}))
 await within(screen.getByRole("dialog")).findByText("Recuento")
 expect(historial).toHaveBeenCalledWith(fila.productoId);expect(ajustar).not.toHaveBeenCalled()
})
it("error de lectura no equivale a stock cero y permite reintento",()=>{
 render(<ExistenciasProducto fila={null}/>);expect(screen.getByRole("alert")).toBeTruthy();expect(screen.queryByText("Sin stock")).toBeNull()
 fireEvent.click(screen.getByRole("button",{name:"Reintentar consulta"}));expect(refresh).toHaveBeenCalledOnce()
})
