import {beforeEach,afterEach,expect,it,vi} from "vitest"
const {guardia,consultar,finanzas}=vi.hoisted(()=>({guardia:vi.fn(),consultar:vi.fn(),finanzas:vi.fn()}))
vi.mock("next/headers",()=>({headers:async()=>new Headers()}))
vi.mock("next/navigation",()=>({redirect:(url:string)=>{throw Error(url)}}))
vi.mock("@/components/admin/resumen-admin",()=>({ResumenAdmin:()=>null}))
vi.mock("@/components/admin/stock-admin",()=>({StockAdmin:()=>null}))
vi.mock("@/lib/modulos/autenticacion/guardia-admin",()=>({exigirAdministradoraEnPagina:guardia}))
vi.mock("@/lib/modulos/inventario/administracion-aplicacion",()=>({obtenerAdministracionInventario:()=>({consultar})}))
vi.mock("@/lib/modulos/finanzas/aplicacion",()=>({obtenerConsultaFinanzas:()=>({consultar:finanzas})}))
import PaginaResumen from "./page"
import PaginaStock from "./stock/page"
beforeEach(()=>{vi.clearAllMocks();guardia.mockResolvedValue(undefined);consultar.mockResolvedValue({filas:[]});finanzas.mockResolvedValue({estado:"datos_invalidos",errores:{}});vi.spyOn(console,"error").mockImplementation(()=>{})})
afterEach(()=>vi.restoreAllMocks())
it("Resumen autoriza antes de una sola consulta existente y pasa sus filas",async()=>{
 consultar.mockResolvedValueOnce({filas:[{nombre:"Real"}]})
 const pagina=await PaginaResumen({searchParams:Promise.resolve({})})
 expect(guardia.mock.invocationCallOrder[0]).toBeLessThan(consultar.mock.invocationCallOrder[0]);expect(consultar).toHaveBeenCalledOnce()
 expect(pagina.props.filas).toEqual([{nombre:"Real"}])
})
it("no consulta sin permiso ni convierte un fallo en alertas vacias",async()=>{
 guardia.mockRejectedValueOnce(Error("sin permiso"));await expect(PaginaResumen({searchParams:Promise.resolve({})})).rejects.toThrow("sin permiso");expect(consultar).not.toHaveBeenCalled();expect(finanzas).not.toHaveBeenCalled()
 consultar.mockRejectedValueOnce(Error("fallo"));expect((await PaginaResumen({searchParams:Promise.resolve({})})).props.errorCarga).toBe(true)
})
it.each(["pocas","sin_stock","invalido"])("pagina Stock aplica filtro de URL %s",async estado=>{
 await expect(PaginaStock({searchParams:Promise.resolve({estado})})).rejects.toThrow(estado==="invalido"?"/admin/productos":`/admin/productos?stock=${estado}`)
 expect(guardia).toHaveBeenCalledOnce();expect(consultar).not.toHaveBeenCalled()
})

it("Resumen respeta el período económico sin pasar fechas a Inventario",async()=>{const filtro={modo:"mes",mes:"2020-01"};await PaginaResumen({searchParams:Promise.resolve(filtro)});expect(finanzas).toHaveBeenCalledWith(expect.any(Headers),filtro,true);expect(consultar).toHaveBeenCalledExactlyOnceWith(expect.any(Headers))})
