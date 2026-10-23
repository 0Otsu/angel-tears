import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { eq, sql } from "drizzle-orm"
import type { ConexionBd } from "@/lib/infraestructura/conexion-bd"
import { categoria, producto } from "@/lib/infraestructura/esquemas/producto"
import { CATEGORIAS_INICIALES } from "@/lib/modulos/productos/categorias"
import { leerProductosInternos, sembrarCategorias } from "@/lib/modulos/productos/persistencia"
import { candidatosSlug } from "@/lib/modulos/productos/reglas-producto"
import { crearConexionPruebas } from "@/pruebas/arnes-bd"
import { ID_OTRO_PRODUCTO_PRUEBA, ID_PRODUCTO_PRUEBA } from "@/pruebas/fixtures/productos"

// Fixtures SQL en la base aislada: prueban la migracion y el adaptador de lectura.
// No representan un alta comercial ni prueban C0/atomicidad con Inventario.
describe("Producto sobre las migraciones versionadas en PostgreSQL", () => {
  let conexion: ConexionBd
  const db = () => conexion.db
  const datos = (id = ID_PRODUCTO_PRUEBA, slug = "collar") => ({
    id, slug, nombre: "Collar de prueba", precio: "90071992547409.93", categoriaCodigo: "collares" as const,
  })

  beforeAll(() => { conexion = crearConexionPruebas() })
  beforeEach(async () => {
    await db().delete(producto)
    await db().delete(categoria)
    await db().transaction(sembrarCategorias)
  })
  afterAll(async () => {
    if (!conexion) return
    try {
      await db().delete(producto)
      await db().delete(categoria)
    } finally {
      await conexion.pool.end()
    }
  })

  it("reconstruye las tablas versionadas y conserva numeric(18,2) sin columnas de stock en Producto", async () => {
    const tablas = await db().execute<{ table_name: string }>(sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY table_name`)
    expect(tablas.rows.map((t) => t.table_name)).toEqual([
      "account", "ajuste_stock", "categoria", "inventario", "movimiento_stock", "producto", "proveedor",
      "rate_limit", "session", "user", "verification",
    ])
    const columnas = await db().execute<{ column_name: string; numeric_precision: number; numeric_scale: number }>(sql`
      SELECT column_name, numeric_precision, numeric_scale FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'producto'`)
    expect(columnas.rows.find((c) => c.column_name === "precio"))
      .toMatchObject({ numeric_precision: 18, numeric_scale: 2 })
    expect(columnas.rows.map((c) => c.column_name)).not.toEqual(expect.arrayContaining(["saldo"]))
    expect(columnas.rows.map((c) => c.column_name)).not.toEqual(expect.arrayContaining(["stock"]))
  })

  it("siembra las siete categorias sin duplicarlas ni reescribir etiquetas existentes", async () => {
    await db().update(categoria).set({ nombre: "Etiqueta conservada" }).where(eq(categoria.codigo, "collares"))
    await db().transaction(sembrarCategorias)
    const filas = await db().select().from(categoria)
    expect(filas.map((c) => c.codigo).sort()).toEqual(CATEGORIAS_INICIALES.map((c) => c.codigo).sort())
    expect(filas.find((c) => c.codigo === "collares")?.nombre).toBe("Etiqueta conservada")
  })

  it("guarda oculto sin imagen y devuelve el precio exacto en la lectura interna", async () => {
    await db().insert(producto).values(datos())
    const [fila] = await leerProductosInternos(db(), [ID_PRODUCTO_PRUEBA])
    expect(fila).toMatchObject({
      id: ID_PRODUCTO_PRUEBA, precio: "90071992547409.93", moneda: "ARS", publicado: false, imagenValida: false,
    })
    const [guardado] = await db().select().from(producto)
    expect(guardado.destacado).toBe(false)
    expect(guardado.imagenAssetId).toBeNull()
  })

  it("reserva slug unico y acepta el fallback minusculo de un UUID en mayusculas", async () => {
    await db().insert(producto).values(datos())
    await expect(db().insert(producto).values(datos(ID_OTRO_PRODUCTO_PRUEBA)))
      .rejects.toMatchObject({ cause: { code: "23505", constraint: "producto_slug_unico" } })
    const id = ID_OTRO_PRODUCTO_PRUEBA.toUpperCase()
    const [, fallback] = candidatosSlug("Collar", id)
    await db().insert(producto).values(datos(id, fallback))
    const [fila] = await leerProductosInternos(db(), [ID_OTRO_PRODUCTO_PRUEBA])
    expect(fila.slug).toBe(`collar-${ID_OTRO_PRODUCTO_PRUEBA}`)
    await expect(db().update(producto).set({ slug: "SLUG-INVALIDO" }).where(eq(producto.id, ID_OTRO_PRODUCTO_PRUEBA)))
      .rejects.toMatchObject({ cause: { code: "23514", constraint: "producto_slug_formato" } })
  })

  it("exige imagen completa para publicar sin romper el borrador sin imagen", async () => {
    await expect(db().insert(producto).values({ ...datos(), publicado: true }))
      .rejects.toMatchObject({ cause: { code: "23514", constraint: "producto_publicado_con_imagen" } })
    await expect(db().insert(producto).values({ ...datos(), imagenAssetId: "incompleta" }))
      .rejects.toMatchObject({ cause: { code: "23514", constraint: "producto_imagen_completa" } })
    await db().insert(producto).values({
      ...datos(), publicado: true, imagenAssetId: "asset-prueba", imagenPublicId: "pruebas/collar",
      imagenVersionProveedor: "1", imagenUrlSegura: "https://images.example.test/collar.jpg",
      imagenAncho: 800, imagenAlto: 600, imagenFormato: "jpeg",
    })
    expect((await leerProductosInternos(db(), [ID_PRODUCTO_PRUEBA]))[0])
      .toMatchObject({ publicado: true, imagenValida: true })
  })

  it("rechaza nombre vacio y precio no finito mediante constraints", async () => {
    await expect(db().insert(producto).values({ ...datos(), nombre: " " }))
      .rejects.toMatchObject({ cause: { code: "23514", constraint: "producto_nombre_requerido" } })
    await expect(db().insert(producto).values({ ...datos(), precio: "NaN" }))
      .rejects.toMatchObject({ cause: { code: "23514", constraint: "producto_precio_finito" } })
  })

  it("exige categoria existente e impide borrar una categoria referenciada", async () => {
    await db().delete(categoria).where(eq(categoria.codigo, "collares"))
    await expect(db().insert(producto).values(datos())).rejects.toMatchObject({ cause: { code: "23503" } })
    await db().transaction(sembrarCategorias)
    await db().insert(producto).values(datos())
    await expect(db().delete(categoria).where(eq(categoria.codigo, "collares")))
      .rejects.toMatchObject({ cause: { code: "23503" } })
  })

  it("revierte una insercion de Producto al fallar su transaccion SQL", async () => {
    await expect(db().transaction(async (tx) => {
      await tx.insert(producto).values(datos())
      throw new Error("fallo deliberado antes del commit")
    })).rejects.toThrow("fallo deliberado antes del commit")
    expect(await leerProductosInternos(db(), [ID_PRODUCTO_PRUEBA])).toEqual([])
  })
})
