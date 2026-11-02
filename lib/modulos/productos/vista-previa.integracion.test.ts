import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import type { ConexionBd } from "@/lib/infraestructura/conexion-bd"
import { producto } from "@/lib/infraestructura/esquemas/producto"
import { productoMedia } from "@/lib/infraestructura/esquemas/producto-media"
import { inventario } from "@/lib/infraestructura/esquemas/inventario"
import { crearExigirAdministradora } from "@/lib/modulos/autenticacion/contrato"
import { crearConexionPruebas } from "@/pruebas/arnes-bd"
import { sembrarCategorias } from "./persistencia"
import { crearConsultaVistaPrevia } from "./vista-previa"
import { crearConsultasCatalogo } from "@/lib/modulos/catalogo/consultas"

let con: ConexionBd, id: string
const exigir = crearExigirAdministradora(async () => ({ id: "admin", nombre: "Admin", email: "admin@example.test" }))
const consultar = (version = 1) => crearConsultaVistaPrevia({ db: con.db, exigir })(new Headers(), { id, version })
async function limpiar() { if (id) { await con.db.delete(inventario).where(eq(inventario.productoId, id)); await con.db.delete(producto).where(eq(producto.id, id)) } }
beforeAll(() => { con = crearConexionPruebas() })
beforeEach(async () => {
  await limpiar(); id = crypto.randomUUID(); await con.db.transaction(sembrarCategorias)
  await con.db.insert(producto).values({ id, slug: `preview-${id}`, nombre: "Anillo de prueba", precio: "33000.50", categoriaCodigo: "anillos", publicado: false, descripcion: "Descripcion real", material: "Acero", medida: "18", color: "Dorado", cuidados: "Paño seco",
    imagenAssetId: "privado-A", imagenPublicId: `prueba/${id}/A`, imagenVersionProveedor: "1", imagenUrlSegura: "https://example.test/A.png", imagenAncho: 640, imagenAlto: 480, imagenFormato: "png" })
  await con.db.insert(inventario).values({ productoId: id, cantidad: 0, minimo: 7 })
  await con.db.insert(productoMedia).values({ productoId: id, orden: 2, assetId: "privado-B", publicId: `prueba/${id}/B`, versionProveedor: "1", urlSegura: "https://example.test/B.png", ancho: 640, alto: 480, formato: "png" })
})
afterAll(async () => { if (con) { await limpiar(); await con.pool.end() } })
it("sin sesion no valida ni ejecuta lecturas para preview", async () => {
  const select = vi.spyOn(con.db, "select")
  try { await expect(crearConsultaVistaPrevia({ db: con.db, exigir: crearExigirAdministradora(async () => null) })(new Headers(), null)).rejects.toMatchObject({ codigo: "SESION_REQUERIDA" }); expect(select).not.toHaveBeenCalled() } finally { select.mockRestore() }
})
it("oculto tiene preview autorizada real sin mutarlo; publico sigue sin ficha", async () => {
  const antes = await con.db.select().from(producto).where(eq(producto.id, id))
  const resultado = await consultar()
  expect(resultado).toMatchObject({ estado: "ok", version: 1, producto: { nombre: "Anillo de prueba", precio: "33000.50", material: "Acero", medida: "18", cuidados: "Paño seco", disponible: false, galeria: [{ url: "https://example.test/A.png" }, { url: "https://example.test/B.png" }] } })
  if (resultado.estado !== "ok") throw Error("Se esperaba proyeccion")
  expect(JSON.stringify(resultado.producto)).not.toMatch(/privado|cantidad|minimo|version|publicado|assetId|publicId/)
  expect(await crearConsultasCatalogo(con.db).consultarPorSlug(`preview-${id}`)).toBeNull()
  expect(await con.db.select().from(producto).where(eq(producto.id, id))).toEqual(antes)
})
it("preview y PDP publicado usan la misma proyeccion y disponibilidad de Inventario", async () => {
  await con.db.update(producto).set({ publicado: true }).where(eq(producto.id, id))
  await con.db.update(inventario).set({ cantidad: 3 }).where(eq(inventario.productoId, id))
  const r = await consultar()
  if (r.estado !== "ok") throw Error("Se esperaba proyeccion")
  expect(r.producto.disponible).toBe(true)
  expect(r.producto).toEqual(await crearConsultasCatalogo(con.db).consultarPorSlug(`preview-${id}`))
})
it("rechaza version vieja y referencias invalidas sin sustituir el snapshot del editor", async () => {
  expect(await consultar(2)).toEqual({ estado: "conflicto_version" })
  expect(await crearConsultaVistaPrevia({ db: con.db, exigir })(new Headers(), { id: "invalido", version: 1 })).toEqual({ estado: "datos_invalidos" })
  expect(await crearConsultaVistaPrevia({ db: con.db, exigir })(new Headers(), { id: crypto.randomUUID(), version: 1 })).toEqual({ estado: "no_encontrado" })
})
