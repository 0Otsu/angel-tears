import {afterEach,beforeEach,expect,it,vi} from "vitest"
const {guardia,listar,auxiliar}=vi.hoisted(()=>({guardia:vi.fn(),listar:vi.fn(),auxiliar:vi.fn()}))
vi.mock("next/headers",()=>({headers:async()=>new Headers()}))
vi.mock("next/navigation",()=>({redirect:(ruta:string)=>{throw Error(ruta)}}))
vi.mock("@/lib/modulos/autenticacion/guardia-admin",()=>({exigirAdministradoraEnPagina:guardia}))
vi.mock("@/lib/modulos/ventas/administracion-aplicacion",()=>({obtenerAdministracionVentas:()=>({listar,productosParaVender:auxiliar})}))
vi.mock("@/lib/modulos/compras/administracion-aplicacion",()=>({obtenerAdministracionCompras:()=>({listar,productosParaComprar:auxiliar,proveedoresParaComprar:auxiliar})}))
vi.mock("@/lib/modulos/egresos/administracion-aplicacion",()=>({obtenerAdministracionEgresos:()=>({listar})}))
vi.mock("@/components/admin/ventas-admin",()=>({VentasAdmin:()=>null}))
vi.mock("@/components/admin/compras-admin",()=>({ComprasAdmin:()=>null}))
vi.mock("@/components/admin/egresos-admin",()=>({EgresosAdmin:()=>null}))
import Ventas from "./ventas/page"
import Compras from "./compras/page"
import Gastos from "./gastos/page"
beforeEach(()=>{vi.clearAllMocks();vi.useFakeTimers();vi.setSystemTime(new Date("2026-11-11T15:00Z"));guardia.mockResolvedValue(undefined);auxiliar.mockResolvedValue([]);listar.mockResolvedValue({estado:"ok",ventas:[],compras:[],egresos:[],hayMas:true,paginacion:{pagina:2,porPagina:25,total:76,paginas:4}})})
afterEach(()=>vi.useRealTimers())
it.each([Ventas,Compras,Gastos])("listado resuelve mismo mes, limita 25, conserva pagina y autoriza primero",async pagina=>{
 const r=await pagina({searchParams:Promise.resolve({pagina:"2"})})
 expect(listar).toHaveBeenCalledExactlyOnceWith(expect.any(Headers),{periodo:"mes",desde:"2026-11-01",hasta:"2026-11-30",estado:"",pagina:"2",limite:25})
 expect(guardia.mock.invocationCallOrder[0]).toBeLessThan(listar.mock.invocationCallOrder[0])
 expect(r.props.paginacion).toEqual({pagina:2,porPagina:25,total:76,paginas:4})
})
it.each([Ventas,Compras,Gastos])("periodo invalido no consulta historial ni revela datos",async pagina=>{
 const r=await pagina({searchParams:Promise.resolve({periodo:"inventado"})});expect(listar).not.toHaveBeenCalled();expect(r.props.erroresFiltro.periodo).toBeTruthy()
})
it.each([Ventas,Compras,Gastos])("sin sesion no consulta historial ni selectores auxiliares",async pagina=>{
 guardia.mockRejectedValue(Error("sin permiso"));await expect(pagina({searchParams:Promise.resolve({periodo:"todo"})})).rejects.toThrow("sin permiso");expect(listar).not.toHaveBeenCalled();expect(auxiliar).not.toHaveBeenCalled()
})
