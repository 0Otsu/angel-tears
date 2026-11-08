import {beforeEach,afterEach,expect,it,vi} from "vitest"
const {guardia,consultar}=vi.hoisted(()=>({guardia:vi.fn(),consultar:vi.fn()}))
vi.mock("next/headers",()=>({headers:async()=>new Headers()}))
vi.mock("next/navigation",()=>({redirect:()=>{throw Error("redireccion")}}))
vi.mock("@/components/admin/resumen-admin",()=>({ResumenAdmin:()=>null}))
vi.mock("@/components/admin/stock-admin",()=>({StockAdmin:()=>null}))
vi.mock("@/lib/modulos/autenticacion/guardia-admin",()=>({exigirAdministradoraEnPagina:guardia}))
vi.mock("@/lib/modulos/inventario/administracion-aplicacion",()=>({obtenerAdministracionInventario:()=>({consultar})}))
import PaginaResumen from "./page"
import PaginaStock from "./stock/page"
beforeEach(()=>{vi.clearAllMocks();guardia.mockResolvedValue(undefined);consultar.mockResolvedValue({filas:[]});vi.spyOn(console,"error").mockImplementation(()=>{})})
afterEach(()=>vi.restoreAllMocks())
it("Resumen autoriza antes de una sola consulta existente y pasa sus filas",async()=>{
 consultar.mockResolvedValueOnce({filas:[{nombre:"Real"}]})
 const pagina=await PaginaResumen()
 expect(guardia.mock.invocationCallOrder[0]).toBeLessThan(consultar.mock.invocationCallOrder[0]);expect(consultar).toHaveBeenCalledOnce()
 expect(pagina.props.filas).toEqual([{nombre:"Real"}])
})
it("no consulta sin permiso ni convierte un fallo en alertas vacias",async()=>{
 guardia.mockRejectedValueOnce(Error("sin permiso"));await expect(PaginaResumen()).rejects.toThrow("sin permiso");expect(consultar).not.toHaveBeenCalled()
 consultar.mockRejectedValueOnce(Error("fallo"));expect((await PaginaResumen()).props.errorCarga).toBe(true)
})
it.each(["pocas","sin_stock","invalido"])("pagina Stock aplica filtro de URL %s",async estado=>{
 const pagina=await PaginaStock({searchParams:Promise.resolve({estado})})
 expect(pagina.props.filtroInicial).toBe(estado==="invalido"?"":estado);expect(consultar).toHaveBeenCalledOnce()
})
