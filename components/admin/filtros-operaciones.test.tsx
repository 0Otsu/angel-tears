import {fireEvent,render,screen} from "@testing-library/react"
import {beforeEach,expect,it,vi} from "vitest"
import {FiltrosOperacionesAdmin} from "./filtros-operaciones"
import {PaginacionOperaciones} from "./paginacion-operaciones"
const {push}=vi.hoisted(()=>({push:vi.fn()}))
vi.mock("next/navigation",()=>({useRouter:()=>({push})}))
const filtros={periodo:"mes" as const,estado:"",desde:"2026-11-01",hasta:"2026-11-30",pagina:"4"}
beforeEach(()=>vi.clearAllMocks())
it("patron compacto no muestra fechas ni boton Filtrar; estado se aplica y reinicia pagina",()=>{
 render(<FiltrosOperacionesAdmin ruta="/admin/gastos" filtros={filtros}/>);
 expect(screen.queryByLabelText("Desde")).toBeNull();expect(screen.queryByRole("button",{name:"Filtrar"})).toBeNull()
 fireEvent.change(screen.getByLabelText("Estado"),{target:{value:"ANULADO"}})
 expect(push).toHaveBeenCalledWith("/admin/gastos?periodo=mes&estado=ANULADO",{scroll:false})
})
it("elegir fechas muestra controles y aplica un rango valido sin enviar otro invalido",()=>{
 render(<FiltrosOperacionesAdmin ruta="/admin/compras" filtros={filtros} femenino/>);
 fireEvent.change(screen.getByLabelText("Período"),{target:{value:"fechas"}})
 expect(screen.getByLabelText("Desde")).toBeTruthy();push.mockClear()
 fireEvent.change(screen.getByLabelText("Desde"),{target:{value:"2026-12-01"}})
 expect(push).not.toHaveBeenCalled()
 fireEvent.change(screen.getByLabelText("Hasta"),{target:{value:"2026-12-31"}})
 expect(push).toHaveBeenCalledWith("/admin/compras?periodo=fechas&desde=2026-12-01&hasta=2026-12-31",{scroll:false})
})
it("volver con parametros nuevos actualiza los controles sin perder el componente",()=>{
 const {rerender}=render(<FiltrosOperacionesAdmin ruta="/admin/gastos" filtros={filtros}/>);
 fireEvent.change(screen.getByLabelText("Estado"),{target:{value:"ANULADO"}})
 rerender(<FiltrosOperacionesAdmin ruta="/admin/gastos" filtros={{...filtros,estado:"CONFIRMADO"}}/>);
 expect((screen.getByLabelText("Estado") as HTMLSelectElement).value).toBe("CONFIRMADO")
})
it("pagina anterior y siguiente preservan periodo, estado y fechas; total visible",()=>{
 render(<PaginacionOperaciones ruta="/admin/ventas" filtros={{...filtros,estado:"ANULADA"}} datos={{pagina:2,porPagina:25,total:1001,paginas:41}}/>);
 expect(screen.getByText("Página 2 de 41")).toBeTruthy()
 fireEvent.click(screen.getByRole("button",{name:"Siguiente"}));expect(push).toHaveBeenCalledWith("/admin/ventas?periodo=mes&estado=ANULADA&pagina=3")
})
it("cero registros mantiene limites de pagina y navegacion deshabilitada",()=>{
 render(<PaginacionOperaciones ruta="/admin/gastos" filtros={filtros} datos={{pagina:1,porPagina:25,total:0,paginas:1}}/>);
 expect((screen.getByRole("button",{name:"Anterior"}) as HTMLButtonElement).disabled).toBe(true)
 expect((screen.getByRole("button",{name:"Siguiente"}) as HTMLButtonElement).disabled).toBe(true)
})
