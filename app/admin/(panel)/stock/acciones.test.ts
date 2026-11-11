import {beforeEach,expect,it,vi} from "vitest"
const {ajustar,revalidar}=vi.hoisted(()=>({ajustar:vi.fn(),revalidar:vi.fn()}))
vi.mock("next/headers",()=>({headers:async()=>new Headers()}))
vi.mock("next/cache",()=>({revalidatePath:revalidar}))
vi.mock("@/lib/modulos/inventario/administracion-aplicacion",()=>({obtenerAdministracionInventario:()=>({ajustar})}))
import {ajustarStockAccion} from "./acciones"
beforeEach(()=>vi.clearAllMocks())
it("devuelve el saldo confirmado y refresca Productos, edicion, Dashboard y superficies existentes",async()=>{
 const entrada={productoId:"id",cantidad:"2",tipo:"INCREMENTO",motivo:"Recuento",claveSolicitud:"clave"}
 ajustar.mockResolvedValue({estado:"ok",saldoResultante:5,repetido:false})
 expect(await ajustarStockAccion(entrada)).toEqual({estado:"ok",saldoResultante:5,repetido:false})
 expect(ajustar).toHaveBeenCalledWith(expect.any(Headers),entrada)
 for(const ruta of ["/admin/productos","/admin","/admin/stock","/","/catalogo"])expect(revalidar).toHaveBeenCalledWith(ruta)
 expect(revalidar).toHaveBeenCalledWith("/admin/productos/[id]/editar","page")
 expect(revalidar).toHaveBeenCalledWith("/catalogo/[slug]","page")
})
it.each(["sesion_requerida","stock_insuficiente","conflicto_solicitud"])("sin confirmacion %s no invalida ni inventa saldo",async estado=>{
 ajustar.mockResolvedValue({estado});expect(await ajustarStockAccion({})).toEqual({estado});expect(revalidar).not.toHaveBeenCalled()
})
