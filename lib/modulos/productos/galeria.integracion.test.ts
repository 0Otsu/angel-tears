import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest"
import { eq, sql } from "drizzle-orm"
import { crearConexionPruebas } from "@/pruebas/arnes-bd"
import { crearExigirAdministradora } from "@/lib/modulos/autenticacion/contrato"
import { producto, categoria } from "@/lib/infraestructura/esquemas/producto"
import { productoMedia } from "@/lib/infraestructura/esquemas/producto-media"
import { inventario } from "@/lib/infraestructura/esquemas/inventario"
import { crearContratoInventario } from "@/lib/modulos/inventario/persistencia"
import { insertarProductoOcultoConSaldo, sembrarCategorias } from "./persistencia"
import { almacenImagenPrueba, crearImagenPrueba, referenciaImagenPrueba } from "@/pruebas/imagenes-producto"
import { crearGaleriaProductos } from "./galeria-servicio"
import { crearPublicacionProductos } from "./publicacion"
import { crearConsultasCatalogo } from "@/lib/modulos/catalogo/consultas"
import { metadataProducto } from "@/lib/modulos/catalogo/metadata-publica"
import { crearCargaImagenProducto, crearReemplazoImagenProducto } from "./imagen-servicio"
import { crearManejadorGaleria } from "./galeria-http"

let con: ReturnType<typeof crearConexionPruebas>, id: string, png: Buffer
const exigir = crearExigirAdministradora(async () => ({ id: "admin", nombre: "Admin", email: "admin@ejemplo.test" }))
const h = new Headers({ origin: "http://localhost:3000" }), almacen = almacenImagenPrueba()
const subir = vi.spyOn(almacen, "almacenarImagen"), destruir = vi.spyOn(almacen, "eliminarImagen")
const servicio = () => crearGaleriaProductos({ db: con.db, exigir, almacen })
const leer = async () => (await con.db.select().from(producto).where(eq(producto.id, id)))[0]
const guardar = (version: number, medio?: string) => servicio().guardar(h, { id, version }, png, medio)
async function limpiar() {
  await con.db.execute(sql`DROP TRIGGER IF EXISTS galeria_fallar ON producto`)
  await con.db.execute(sql`DROP FUNCTION IF EXISTS galeria_fallar()`)
  await con.db.delete(inventario); await con.db.delete(producto); await con.db.delete(categoria)
}
beforeAll(async () => { con = crearConexionPruebas(); png = await crearImagenPrueba() })
beforeEach(async () => {
  await limpiar(); id = crypto.randomUUID()
  subir.mockReset().mockImplementation(async ({ publicId }) => referenciaImagenPrueba(publicId)); destruir.mockReset().mockResolvedValue()
  await con.db.transaction(async tx => { await sembrarCategorias(tx); await insertarProductoOcultoConSaldo(tx, id, { nombre: "Producto galeria", precio: "222.50", categoriaCodigo: "collares" }, crearContratoInventario(con.db).crearSaldoCero) })
})
afterAll(async () => { if (con) { await limpiar(); await con.pool.end() } })
it("varias imagenes, principal unica y maximo siete incluso en SQL", async () => {
  const antes = await leer()
  let r = await guardar(1)
  for (let version = 2; version <= 7; version++) r = await guardar(version)
  expect(r.medios).toHaveLength(7); expect(r.medios.filter(m => m.principal)).toHaveLength(1)
  await expect(guardar(8)).rejects.toMatchObject({ codigo: "limite_medios" })
  expect(subir).toHaveBeenCalledTimes(7)
  await expect(con.db.insert(productoMedia).values({ ...referenciaImagenPrueba("octava"), productoId: id, orden: 8 })).rejects.toThrow()
  expect(await leer()).toMatchObject({ slug: antes.slug, precio: antes.precio, publicado: false, destacado: false, version: 8 })
  expect((await con.db.select().from(inventario))[0].cantidad).toBe(0)
})
it("cambiar principal actualiza proyeccion publica y mantiene toda la galeria", async () => {
  await guardar(1); const r = await guardar(2)
  const b = r.medios[1]
  const antes = await leer(), saldoAntes = await con.db.select().from(inventario)
  await servicio().cambiar(h, { id, version: 3 }, b.id, "principal")
  expect(await leer()).toMatchObject({ slug: antes.slug, precio: antes.precio, categoriaCodigo: antes.categoriaCodigo, destacado: antes.destacado, publicado: antes.publicado })
  expect(await con.db.select().from(inventario)).toEqual(saldoAntes)
  const publicar = crearPublicacionProductos({ db: con.db, exigir })
  expect((await publicar(h, { id, version: 4, accion: "publicar" })).estado).toBe("ok")
  const p = await leer(), publico = await crearConsultasCatalogo(con.db).consultarPorSlug(p.slug)
  expect(p.imagenPublicId).toBe(b.publicId); expect(publico?.imagen?.url).toBe(b.urlSegura)
  expect(publico?.galeria).toHaveLength(2); expect(JSON.stringify(publico?.galeria)).not.toContain("publicId")
  expect(destruir).not.toHaveBeenCalled()
  // Stock de fixture para comprobar los tres consumidores de la proyeccion de cards.
  await con.db.update(inventario).set({ cantidad: 3 }).where(eq(inventario.productoId, id))
  expect((await publicar(h, { id, version: 5, accion: "destacar" })).estado).toBe("ok")
  const catalogo = crearConsultasCatalogo(con.db)
  expect((await catalogo.listar())[0].imagen?.url).toBe(b.urlSegura)
  expect((await catalogo.listar({ destacados: true }))[0].imagen?.url).toBe(b.urlSegura)
  expect((await catalogo.listar({ categoriaCodigo: "collares", excluirId: crypto.randomUUID(), limite: 3 }))[0].imagen?.url).toBe(b.urlSegura)
  expect(metadataProducto(publico!)).toMatchObject({ openGraph: { images: [{ url: b.urlSegura }] } })
})
it("quitar principal publicada promueve otra; quitar ultima publicada se rechaza", async () => {
  await guardar(1); const r = await guardar(2)
  await crearPublicacionProductos({ db: con.db, exigir })(h, { id, version: 3, accion: "publicar" })
  const cambiado = await servicio().cambiar(h, { id, version: 4 }, r.medios[0].id, "quitar")
  expect(cambiado.medios[0]).toMatchObject({ principal: true, id: r.medios[1].id })
  expect(destruir).toHaveBeenCalledWith(r.medios[0].publicId)
  await expect(servicio().cambiar(h, { id, version: 5 }, r.medios[1].id, "quitar")).rejects.toMatchObject({ codigo: "ultima_imagen_publicada" })
  expect((await leer()).publicado).toBe(true)
})
it("oculto permite cero imagenes sin perder Producto ni C0", async () => {
  const r = await guardar(1)
  const vacio = await servicio().cambiar(h, { id, version: 2 }, r.medios[0].id, "quitar")
  expect(vacio.imagen).toBeNull(); expect(vacio.medios).toHaveLength(0); expect((await leer()).version).toBe(3)
  expect((await con.db.select().from(inventario))[0].cantidad).toBe(0)
})
it("reemplazo secundario mantiene principal; destroy ocurre con la referencia nueva confirmada", async () => {
  await guardar(1); const r = await guardar(2)
  destruir.mockImplementation(async publicId => { expect((await con.db.select().from(productoMedia)).some(m => m.publicId === publicId)).toBe(false) })
  const b = await guardar(3, r.medios[1].id)
  expect(b.imagen).toEqual(r.imagen); expect(b.medios[1].publicId).not.toBe(r.medios[1].publicId)
  expect(destruir).toHaveBeenCalledWith(r.medios[1].publicId)
})
it("fallo SQL conserva A y compensa exclusivamente B", async () => {
  const r = await guardar(1)
  await con.db.execute(sql`CREATE FUNCTION galeria_fallar() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fallo controlado'; END $$`)
  await con.db.execute(sql`CREATE TRIGGER galeria_fallar BEFORE UPDATE ON producto FOR EACH ROW EXECUTE FUNCTION galeria_fallar()`)
  await expect(guardar(2, r.medios[0].id)).rejects.toMatchObject({ codigo: "error_persistencia" })
  expect((await servicio().consultar(h, id)).medios).toEqual(r.medios)
  expect(destruir).toHaveBeenCalledTimes(1); expect(destruir).not.toHaveBeenCalledWith(r.medios[0].publicId)
})
it("cleanup fallido despues del commit no revierte ni elimina el ganador", async () => {
  const r = await guardar(1); destruir.mockRejectedValue(new Error("fallo controlado"))
  const b = await guardar(2, r.medios[0].id)
  expect(b.limpiezaPendiente).toBe(true); expect((await leer()).imagenPublicId).toBe(b.medios[0].publicId)
})
it("dos cargas de la misma version: un ganador y compensacion del perdedor", async () => {
  const resultados = await Promise.allSettled([guardar(1), guardar(1)])
  expect(resultados.filter(r => r.status === "fulfilled")).toHaveLength(1)
  const [medio] = (await servicio().consultar(h, id)).medios
  expect(destruir).not.toHaveBeenCalledWith(medio.publicId)
  expect((await leer()).version).toBe(2)
})
it("endpoints historicos sincronizan la relacion sin perder otras imagenes", async () => {
  await crearCargaImagenProducto({ db: con.db, exigir, almacen })(h, { id, version: 1 }, png)
  const r = await guardar(2)
  await crearReemplazoImagenProducto({ db: con.db, exigir, almacen })(h, { id, version: 3 }, png)
  const actual = await servicio().consultar(h, id)
  expect(actual.medios).toHaveLength(2); expect(actual.medios[1]).toEqual(r.medios[1])
  expect(actual.imagen?.publicId).toBe((await leer()).imagenPublicId)
})
it("guard, origen, entrada y bytes invalidos no contactan al proveedor", async () => {
  const sinSesion = crearExigirAdministradora(async () => null)
  const atender = crearManejadorGaleria({ db: con.db, exigir: sinSesion, almacen, origen: () => "http://localhost:3000", alGuardar: () => {} })
  expect((await atender(new Request("http://localhost:3000", { method: "POST" }), id)).status).toBe(401)
  const autorizado = crearManejadorGaleria({ db: con.db, exigir, almacen, origen: () => "http://localhost:3000", alGuardar: () => {} })
  expect((await autorizado(new Request("http://localhost:3000", { method: "DELETE", headers: { origin: "https://ajeno.test" } }), id, crypto.randomUUID())).status).toBe(403)
  await expect(servicio().guardar(h, { id, version: 1 }, new Uint8Array([1, 2, 3]))).rejects.toMatchObject({ codigo: "tipo_invalido" })
  expect(subir).not.toHaveBeenCalled()
})
