import {fireEvent,render,screen,within} from "@testing-library/react"
import {expect,it,vi} from "vitest"
import {ResumenAdmin} from "./resumen-admin"
import {StockAdmin} from "./stock-admin"
import {ProductosAdmin} from "./productos-admin"
import {filtroStock} from "@/lib/presentacion/inventario"
import type {FilaStock} from "@/lib/modulos/inventario/administracion-contrato"
vi.mock("next/navigation",()=>({useRouter:()=>({refresh:vi.fn()})}))
vi.mock("@/app/admin/(panel)/stock/acciones",()=>({ajustarStockAccion:vi.fn(),cambiarMinimoAccion:vi.fn(),consultarHistorialAccion:vi.fn()}))
const filas: FilaStock[]=[0,3,4].map((saldo,i)=>({productoId:String(i),nombre:`Producto ${saldo}`,saldo,minimo:null,stockBajo:false,sinStock:saldo===0,publicado:true,categoriaNombre:"Anillos"}))
it("indicadores conservan su categoria con cero y Total permanece neutro",()=>{
 render(<ResumenAdmin filas={[filas[2]]}/>);
 expect(screen.getByRole("link",{name:"Sin stock 0"}).className).toContain("bg-rose-50/40")
 expect(screen.getByRole("link",{name:"Pocas unidades 0"}).className).toContain("bg-amber-50/40")
 expect(screen.getByRole("link",{name:"Total de productos 1"}).className).not.toMatch(/rose|amber/)
 expect(screen.getByText("Todo el inventario está al día")).toBeTruthy()
})
it("reposicion prioriza urgencia y comparte paleta y etiquetas con Inventario",()=>{
 render(<ResumenAdmin filas={[filas[1],filas[2],filas[0]]}/>);
 const items=screen.getAllByRole("listitem")
 expect(items.map(item=>item.textContent)).toEqual([expect.stringContaining("Producto 0"),expect.stringContaining("Producto 3")])
 expect(items[0].className).toContain("bg-rose-50/30")
 expect(items[1].className).toContain("bg-amber-50/30")
 expect(within(items[0]).getByText("Sin stock").className).toContain("text-rose-900")
 expect(within(items[1]).getByText("Pocas unidades").className).toContain("text-amber-900")
 expect(screen.getByRole("link",{name:"Sin stock 1"}).className).toContain("bg-rose-50")
 expect(screen.getByRole("link",{name:"Pocas unidades 1"}).className).toContain("bg-amber-50")
})
it.each([["Sin stock",["Producto 0"]],["Pocas unidades",["Producto 3"]],["Total de productos",["Producto 0","Producto 3","Producto 4"]]])("acceso Dashboard %s abre el filtro con los registros correctos",(nombre,esperados)=>{
 const {unmount}=render(<ResumenAdmin filas={filas}/>);
 const enlace=screen.getByRole("link",{name:new RegExp(`^${nombre}`)})
 const url=new URL(enlace.getAttribute("href")!,"http://localhost")
 expect(url.pathname).toBe("/admin/productos")
 const filtro=filtroStock(url.searchParams.get("stock"));unmount()
 render(<ProductosAdmin consulta={{categorias:[],productos:filas.map(f=>({id:f.productoId,nombre:f.nombre,slug:f.productoId,precio:"10.00",categoriaCodigo:"anillos",categoriaNombre:"Anillos",publicado:true,destacado:false,version:1,tieneImagen:false,imagen:null,descripcion:null,material:null,medida:null,color:null,cuidados:null}))}} existencias={Object.fromEntries(filas.map(f=>[f.productoId,f.saldo]))} filtroStockInicial={filtro}/>);
 const tabla=screen.getByRole("table",{name:"Productos registrados"})
 expect(within(tabla).getAllByRole("heading").map(h=>h.textContent)).toEqual(esperados)
})
it("tarjetas filtran y priorizan sin stock/pocas, sin datos mock",()=>{
 render(<StockAdmin filas={filas}/>);
 fireEvent.click(screen.getByRole("button",{name:/^Pocas unidades/}));
 expect(screen.getByRole("heading",{name:"Producto 3"})).toBeTruthy()
 expect(screen.queryByRole("heading",{name:"Producto 4"})).toBeNull()
 fireEvent.click(screen.getByRole("button",{name:/^Total de productos/}));
 expect(screen.getByRole("table").textContent?.indexOf("Producto 0")).toBeLessThan(screen.getByRole("table").textContent!.indexOf("Producto 3"))
})
it("Dashboard disponible sin alertas muestra vacio honesto; error no muestra ceros falsos",()=>{
 const {rerender}=render(<ResumenAdmin filas={[filas[2]]}/>);
 expect(screen.getByText("Todo el inventario está al día")).toBeTruthy()
 expect(screen.queryByText(/Sin alertas según|Criterio general:|provisor|DTO|heredad/i)).toBeNull()
 expect(screen.queryByText(/Ventas del período/)).toBeNull()
 rerender(<ResumenAdmin filas={[]} errorCarga/>);
 expect(screen.getByRole("alert")).toBeTruthy();expect(screen.queryByRole("link",{name:/^Sin stock/})).toBeNull()
})

it("limites 0/1/3/4: indicadores y filtros usan el mismo criterio general",()=>{
 const limites: FilaStock[]=[0,1,2,3,4].map((saldo,i)=>({...filas[0],productoId:String(i),saldo,nombre:`Limite ${saldo}`,sinStock:saldo===0}))
 render(<StockAdmin filas={limites}/>);
 expect(screen.getByRole("button",{name:"Pocas unidades 3"})).toBeTruthy()
 fireEvent.change(screen.getByLabelText("Estado"),{target:{value:"pocas"}})
 expect(within(screen.getByRole("table")).getAllByRole("heading").map(h=>h.textContent)).toEqual(["Limite 1","Limite 2","Limite 3"])
 fireEvent.change(screen.getByLabelText("Estado"),{target:{value:"disponible"}})
 expect(within(screen.getByRole("table")).getAllByRole("heading").map(h=>h.textContent)).toEqual(["Limite 4"])
})

it("minimos historicos no generan estados ni interfaces contradictorias",()=>{
 render(<StockAdmin filas={[{...filas[2],saldo:8,minimo:10,stockBajo:true}]}/>);
 expect(screen.getByText("Todo el inventario está al día")).toBeTruthy()
 expect(screen.queryByText(/Sin alertas según|Criterio general:/)).toBeNull()
 expect(within(screen.getByRole("table")).getByText("Disponible")).toBeTruthy()
 expect(screen.queryByText(/Alerta de mínimo|Sin mínimo|Mínimo:/)).toBeNull()
 expect(screen.queryByText(/provisori/i)).toBeNull()
})
