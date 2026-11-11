import {expect,it} from "vitest"
import {paginar,validarPaginacion} from "./paginacion"
it("predetermina 25, acepta texto y conserva limites para clientes existentes",()=>{
 expect(validarPaginacion({}).data).toEqual({pagina:1,limite:25})
 expect(validarPaginacion({pagina:"2",limite:"200"}).data).toEqual({pagina:2,limite:200})
})
it.each([0,-1,1.5,"1e3","Infinity",true,[],1000001])("rechaza pagina %s",pagina=>expect(validarPaginacion({pagina}).success).toBe(false))
it.each([0,-1,201,"no",[]])("rechaza limite %s",limite=>expect(validarPaginacion({limite}).success).toBe(false))
it("vacio y pagina fuera de rango se normalizan sin offset arbitrariamente grande",()=>{
 expect(paginar(0,9,25)).toEqual({pagina:1,porPagina:25,total:0,paginas:1})
 expect(paginar(1001,999,25)).toEqual({pagina:41,porPagina:25,total:1001,paginas:41})
})
