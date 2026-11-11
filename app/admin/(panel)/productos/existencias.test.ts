import {beforeEach,expect,it,vi} from "vitest"
const {guardia,consultar,saldos}=vi.hoisted(()=>({guardia:vi.fn(),consultar:vi.fn(),saldos:vi.fn()}))
vi.mock("next/headers",()=>({headers:async()=>new Headers()}))
vi.mock("next/navigation",()=>({redirect:()=>{throw Error("redireccion")},notFound:()=>{throw Error("404")}}))
vi.mock("@/lib/modulos/autenticacion/guardia-admin",()=>({exigirAdministradoraEnPagina:guardia}))
vi.mock("@/lib/modulos/productos/administracion-aplicacion",()=>({obtenerAdministracionProductos:()=>({consultar})}))
vi.mock("@/lib/modulos/inventario/persistencia",()=>({crearContratoInventario:()=>({consultarDisponibilidad:saldos})}))
vi.mock("@/lib/infraestructura/db",()=>({obtenerDb:()=>({})}))
vi.mock("@/components/admin/productos-admin",()=>({ProductosAdmin:()=>null}))
vi.mock("@/components/admin/editor-producto",()=>({EditorProducto:()=>null}))
import PaginaProductos from "./page"
import PaginaEditar from "./[id]/editar/page"
const id="cd12704c-e5a7-4216-b16e-ad6d7ae47490"
beforeEach(()=>{vi.resetAllMocks();guardia.mockResolvedValue(undefined);consultar.mockResolvedValue({productos:[{id,nombre:"Anillo",categoriaNombre:"Anillos",publicado:true}],categorias:[]});saldos.mockResolvedValue([{productoId:id,saldo:3,minimo:100,hayStock:true}])})
it("listado usa una sola lectura agrupada del contrato despues del guard y conserva el saldo exacto",async()=>{
 const pagina=await PaginaProductos({searchParams:Promise.resolve({stock:"pocas"})})
 expect(saldos).toHaveBeenCalledExactlyOnceWith([id]);expect(guardia.mock.invocationCallOrder[0]).toBeLessThan(saldos.mock.invocationCallOrder[0])
 expect(pagina.props.existencias).toEqual({[id]:3});expect(pagina.props.filtroStockInicial).toBe("pocas")
})
it("edicion obtiene existencias del contrato sin incluirlas en el DTO comercial",async()=>{
 const pagina=await PaginaEditar({params:Promise.resolve({id}),searchParams:Promise.resolve({})})
 expect(pagina.props.existencias).toMatchObject({saldo:3,productoId:id,stockBajo:true});expect(pagina.props.producto).not.toHaveProperty("saldo")
})
it("sin autorizacion no ejecuta consultas de Productos ni Inventario",async()=>{
 guardia.mockRejectedValue(Error("sin sesion"));await expect(PaginaProductos({searchParams:Promise.resolve({})})).rejects.toThrow("sin sesion")
 await expect(PaginaEditar({params:Promise.resolve({id}),searchParams:Promise.resolve({})})).rejects.toThrow("sin sesion")
 expect(consultar).not.toHaveBeenCalled();expect(saldos).not.toHaveBeenCalled()
})
it("fallo de disponibilidad conserva Producto y no lo convierte en cero",async()=>{
 const log=vi.spyOn(console,"error").mockImplementation(()=>{});saldos.mockRejectedValue(Error("conexion"))
 try{expect((await PaginaProductos({searchParams:Promise.resolve({})})).props.existencias).toEqual({});expect((await PaginaEditar({params:Promise.resolve({id}),searchParams:Promise.resolve({})})).props.existencias).toBeNull()}finally{log.mockRestore()}
})
