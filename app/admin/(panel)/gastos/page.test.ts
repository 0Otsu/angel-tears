import {beforeEach,expect,it,vi} from "vitest"
import {ErrorSesionRequerida} from "@/lib/modulos/autenticacion/contrato"
const {guardia,listar}=vi.hoisted(()=>({guardia:vi.fn(),listar:vi.fn()}))
vi.mock("next/headers",()=>({headers:async()=>new Headers()}))
vi.mock("next/navigation",()=>({redirect:(ruta:string)=>{throw Error('redirect:'+ruta)}}))
vi.mock("@/lib/modulos/autenticacion/guardia-admin",()=>({exigirAdministradoraEnPagina:guardia}))
vi.mock("@/lib/modulos/egresos/administracion-aplicacion",()=>({obtenerAdministracionEgresos:()=>({listar})}))
vi.mock("@/components/admin/egresos-admin",()=>({EgresosAdmin:()=>null}))
import PaginaGastos from "./page"
import PaginaEgresos from "../egresos/page"
beforeEach(()=>{vi.clearAllMocks();guardia.mockResolvedValue(undefined);listar.mockResolvedValue({estado:"ok",egresos:[{id:"registro-original"}],hayMas:false})})
it("Gastos autoriza y consulta una vez el servicio Egresos existente, sin otro registro",async()=>{
 const filtros={desde:"2026-09-01",hasta:"2026-09-30",estado:"ANULADO"}
 const pagina=await PaginaGastos({searchParams:Promise.resolve(filtros)})
 expect(guardia.mock.invocationCallOrder[0]).toBeLessThan(listar.mock.invocationCallOrder[0])
 expect(listar).toHaveBeenCalledExactlyOnceWith(expect.any(Headers),{...filtros,periodo:"fechas",pagina:"1",limite:25})
 expect(pagina.props.egresos).toEqual([{id:"registro-original"}])
})
it("ruta antigua conserva periodo y estado en un destino interno fijo",async()=>{
 await expect(PaginaEgresos({searchParams:Promise.resolve({desde:"2026-09-01",hasta:"2026-09-30",estado:"ANULADO",limite:"25",next:"https://otro.test"})})).rejects.toThrow("redirect:/admin/gastos?desde=2026-09-01&hasta=2026-09-30&estado=ANULADO&limite=25")
 expect(guardia).toHaveBeenCalledOnce();expect(listar).not.toHaveBeenCalled()
})
it("alias preserva filtros vacios y no copia arrays ni parametros ajenos",async()=>{
 await expect(PaginaEgresos({searchParams:Promise.resolve({desde:"",estado:["CONFIRMADO","ANULADO"],redirect:"https://otro.test"})})).rejects.toThrow("redirect:/admin/gastos?desde=")
})
it("alias conserva periodo y pagina del historial",async()=>{
 await expect(PaginaEgresos({searchParams:Promise.resolve({periodo:"todo",pagina:"3",estado:"ANULADO"})})).rejects.toThrow("redirect:/admin/gastos?estado=ANULADO&periodo=todo&pagina=3")
 expect(listar).not.toHaveBeenCalled()
})
it("sin sesion no consulta ni redirige por fuera de la guardia",async()=>{
 guardia.mockRejectedValue(new ErrorSesionRequerida())
 await expect(PaginaGastos({searchParams:Promise.resolve({})})).rejects.toBeInstanceOf(ErrorSesionRequerida)
 await expect(PaginaEgresos({searchParams:Promise.resolve({})})).rejects.toBeInstanceOf(ErrorSesionRequerida)
 expect(listar).not.toHaveBeenCalled()
})
it("errores de filtros pertenecen al mismo servicio y se muestran sin inventar registros",async()=>{
 listar.mockResolvedValue({estado:"datos_invalidos",errores:{hasta:"Rango inválido"}})
 const pagina=await PaginaGastos({searchParams:Promise.resolve({desde:"2026-11-30",hasta:"2026-11-01"})})
 expect(pagina.props.erroresFiltro).toEqual({hasta:"Rango inválido"});expect(pagina.props.egresos).toEqual([])
})
