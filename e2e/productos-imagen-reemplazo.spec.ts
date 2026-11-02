import { expect, test } from "@playwright/test"
import { eq, inArray } from "drizzle-orm"
import { crearConexionBd } from "../lib/infraestructura/conexion-bd"
import { categoria, producto } from "../lib/infraestructura/esquemas/producto"
import { inventario } from "../lib/infraestructura/esquemas/inventario"
import { crearContratoInventario } from "../lib/modulos/inventario/persistencia"
import { CATEGORIAS_INICIALES, type CodigoCategoria } from "../lib/modulos/productos/categorias"
import { validarUrlBdPruebas } from "../pruebas/guardia-url-bd"
import { crearImagenPrueba } from "../pruebas/imagenes-producto"
import { borrarCuentaDePrueba, CONTRASENA_DE_PRUEBA, crearCuentaDePrueba, EMAIL_DE_PRUEBA, reiniciarLimiteDeIntentos } from "./apoyo/cuenta-de-prueba"

const con = () => crearConexionBd(validarUrlBdPruebas(process.env.DATABASE_URL_TEST, process.env.DATABASE_URL))
const ids: string[] = []
let categoriasAgregadas: CodigoCategoria[] = []
test.beforeAll(async () => {
  await crearCuentaDePrueba()
  const conexion = con()
  try {
    const existentes = await conexion.db.select().from(categoria)
    categoriasAgregadas = CATEGORIAS_INICIALES.map(c=>c.codigo).filter(c=>!existentes.some(e=>e.codigo===c))
    await conexion.db.insert(categoria).values(CATEGORIAS_INICIALES.map(c=>({...c}))).onConflictDoNothing()
  } finally { await conexion.pool.end() }
})
test.afterAll(async () => {
  const conexion = con()
  try {
    if (ids.length) {
      await conexion.db.delete(inventario).where(inArray(inventario.productoId, ids))
      await conexion.db.delete(producto).where(inArray(producto.id, ids))
    }
    if(categoriasAgregadas.length) await conexion.db.delete(categoria).where(inArray(categoria.codigo,categoriasAgregadas))
  } finally { await conexion.pool.end(); await borrarCuentaDePrueba() }
})

for(const [vista,width,height] of [["desktop",1440,1000],["notebook",1280,800],["mobile",390,844]] as const) {
  test(`reemplazo conserva imagen vigente ante error real de configuracion en ${vista}`, async ({page}, info) => {
    const conexion=con(), id=crypto.randomUUID(), nombre=`Reemplazo E2E ${vista}`
    ids.push(id)
    try {
      await conexion.db.transaction(async tx=>{
        await tx.insert(producto).values({id,slug:`reemplazo-e2e-${id}`,nombre,precio:"1234.56",categoriaCodigo:"collares"})
        await crearContratoInventario(conexion.db).crearSaldoCero(tx,id)
      })
      await conexion.db.update(producto).set({imagenAssetId:`asset-${id}`,imagenPublicId:`pruebas/${id}`,imagenVersionProveedor:"1",imagenUrlSegura:"https://images.example.test/anterior.png",imagenAncho:12,imagenAlto:8,imagenFormato:"png",version:2}).where(eq(producto.id,id))
      const [antes]=await conexion.db.select().from(producto).where(eq(producto.id,id))
      const stock=await conexion.db.select().from(inventario).where(eq(inventario.productoId,id))
      const png=await crearImagenPrueba()
      await page.route("https://images.example.test/**",ruta=>ruta.fulfill({status:200,contentType:"image/png",body:png}))
      await page.setViewportSize({width,height})
      await reiniciarLimiteDeIntentos()
      await page.goto("/admin/login")
      await page.getByLabel("Correo electrónico").fill(EMAIL_DE_PRUEBA)
      await page.getByLabel("Contraseña",{exact:true}).fill(CONTRASENA_DE_PRUEBA)
      await page.getByRole("button",{name:"Ingresar",exact:true}).click()
      await expect(page).toHaveURL(/\/admin$/)
      await page.goto("/admin/productos")
      await page.getByRole("button",{name:`Acciones de ${nombre}`,exact:true}).click()
      await page.getByRole("menuitem",{name:"Cambiar imagen",exact:true}).click()
      const panel=page.getByRole("region",{name:`Imagen de ${nombre}`})
      const actual=panel.getByAltText(`Imagen actual de ${nombre}`)
      await expect(actual).toBeVisible()
      const boton=panel.getByRole("button",{name:"Reemplazar imagen",exact:true})
      await boton.focus(); await expect(boton).toBeFocused(); await page.keyboard.press("Enter")
      const archivo=panel.getByLabel("Archivo de imagen principal")
      await archivo.setInputFiles({name:"nueva.png",mimeType:"image/png",buffer:png})
      await expect(panel.getByAltText(/Vista previa/)).toBeVisible()
      await panel.getByRole("button",{name:"Cancelar selección"}).click()
      await expect(panel.getByAltText(/Vista previa/)).toHaveCount(0)
      await expect(actual).toHaveAttribute("src",antes.imagenUrlSegura!)
      await boton.click()
      if(vista==="desktop") {
        const multipart={version:"2",imagen:{name:"nueva.png",mimeType:"image/png",buffer:png}}
        const origenAjeno=await page.request.put(`/api/admin/productos/${id}/imagen`,{headers:{origin:"https://ajeno.test"},multipart})
        expect(origenAjeno.status()).toBe(403)
        const stale=await page.request.put(`/api/admin/productos/${id}/imagen`,{headers:{origin:"http://localhost:3100"},multipart:{...multipart,version:"1"}})
        expect(stale.status()).toBe(409); expect((await stale.json()).codigo).toBe("version_desactualizada")
      }
      await archivo.setInputFiles({name:"nueva.png",mimeType:"image/png",buffer:png})
      const respuesta=page.waitForResponse(r=>r.request().method()==="PUT" && r.url().endsWith(`/api/admin/productos/${id}/imagen`))
      await panel.getByRole("button",{name:"Guardar nueva imagen"}).click()
      expect((await respuesta).status()).toBe(503)
      await expect(panel.getByRole("alert")).toContainText("La carga de imágenes no está disponible")
      await expect(actual).toHaveAttribute("src",antes.imagenUrlSegura!)
      await expect(panel.getByAltText(/Vista previa/)).toBeVisible()
      await panel.getByRole("button",{name:"Reintentar carga"}).click()
      await expect(panel.getByRole("alert")).toContainText("La carga de imágenes no está disponible")
      expect((await conexion.db.select().from(producto).where(eq(producto.id,id)))[0]).toEqual(antes)
      expect(await conexion.db.select().from(inventario).where(eq(inventario.productoId,id))).toEqual(stock)
      expect(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth)).toBe(false)
      await panel.screenshot({path:info.outputPath(`reemplazo-${vista}.png`)})
    } finally {await conexion.pool.end()}
  })
}
test("PUT de imagen sin sesion rechaza sin leer ni reemplazar",async ({request})=>{
  const respuesta=await request.put(`/api/admin/productos/${crypto.randomUUID()}/imagen`,{headers:{origin:"http://localhost:3100"},multipart:{version:"1",imagen:{name:"falso.jpg",mimeType:"image/jpeg",buffer:Buffer.from("falso")}}})
  expect(respuesta.status()).toBe(401)
  expect(await respuesta.json()).toMatchObject({codigo:"sesion_requerida"})
})
