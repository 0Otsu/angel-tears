import { expect,it } from "vitest"
import { estadoVisualStock,resumenStock,coincideFiltroStock,ordenarAtencionStock,filtroStock,estimarAjusteStock } from "./inventario"
import type { FilaStock } from "@/lib/modulos/inventario/administracion-contrato"
const fila=(saldo:number,stockBajo=false):FilaStock=>({productoId:String(saldo),nombre:`Producto ${saldo}`,saldo,minimo:null,sinStock:saldo===0,stockBajo,categoriaNombre:"Aros",publicado:true})
it.each([[0,"sin_stock"],[1,"pocas"],[2,"pocas"],[3,"pocas"],[4,"disponible"]])("saldo %s tiene alerta visual %s",(saldo,estado)=>expect(estadoVisualStock(Number(saldo))).toBe(estado))
it("cuenta por politica visual sin transformar minimo ni stockBajo",()=>{
 const filas=[fila(0),fila(3),fila(8,true)]; const antes=JSON.stringify(filas)
 expect(resumenStock(filas)).toEqual({total:3,sinStock:1,pocas:1})
 expect(coincideFiltroStock(filas[1],"pocas")).toBe(true)
 expect(coincideFiltroStock(filas[2],"disponible")).toBe(true)
 expect(estadoVisualStock(8)).toBe("disponible")
 expect(JSON.stringify(filas)).toBe(antes)
})
it("prioriza reposicion sin mutar el array y descarta filtros desconocidos",()=>{
 const filas=[fila(20),fila(3),fila(0)]
 expect(ordenarAtencionStock(filas).map(f=>f.saldo)).toEqual([0,3,20]);expect(filas[0].saldo).toBe(20)
 expect(filtroStock("pocas")).toBe("pocas");expect(filtroStock("sql")).toBe("")
})
it.each(["","0","-1","1.2","1e2","9999999999"])("no estima cantidad invalida %s",cantidad=>expect(estimarAjusteStock(10,"INCREMENTO",cantidad)).toBeNull())
it("estima inmediato, soporta saldo cero y respeta no negatividad",()=>{
 expect(estimarAjusteStock(0,"INCREMENTO","5")).toEqual({ok:true,saldoResultante:5})
 expect(estimarAjusteStock(5,"DECREMENTO","5")).toEqual({ok:true,saldoResultante:0})
 expect(estimarAjusteStock(5,"DECREMENTO","6")).toEqual({ok:false,disponible:5,requerido:6})
})

it("transiciones de saldo mantienen resumen y clasificacion coherentes",()=>{
 const saldo=[4,3,2,1,0,1,4]
 expect(saldo.map(estadoVisualStock)).toEqual(["disponible","pocas","pocas","pocas","sin_stock","pocas","disponible"])
 for(const valor of saldo){const r=resumenStock([fila(valor,true)]);expect(r.sinStock).toBe(valor===0?1:0);expect(r.pocas).toBe(valor>=1&&valor<=3?1:0)}
 expect(filtroStock("bajo")).toBe("")
})
