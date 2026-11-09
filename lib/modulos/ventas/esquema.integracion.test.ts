import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { eq, sql } from "drizzle-orm"
import type { ConexionBd } from "@/lib/infraestructura/conexion-bd"
import { inventario, movimientoStock } from "@/lib/infraestructura/esquemas/inventario"
import { producto } from "@/lib/infraestructura/esquemas/producto"
import { venta, ventaLinea } from "@/lib/infraestructura/esquemas/venta"
import { crearContratoInventario } from "@/lib/modulos/inventario/persistencia"
import { insertarProductoOcultoConSaldo, sembrarCategorias } from "@/lib/modulos/productos/persistencia"
import { crearConexionPruebas } from "@/pruebas/arnes-bd"

// Restricciones del schema de Ventas contra PostgreSQL real (change implement-sales, 2.1): la base
// rechaza lo que la logica no deberia dejar pasar, aunque alguien se salte el servicio.

const ACTOR = "usuario-prueba-ventas"
const PRODUCTO = "a7777777-7777-4777-8777-777777777777"

describe("schema de ventas sobre PostgreSQL", () => {
  let conexion: ConexionBd | undefined

  function db() {
    if (!conexion) throw new Error("La conexion de pruebas no esta disponible.")
    return conexion.db
  }

  async function limpiar() {
    await db().delete(movimientoStock)
    await db().delete(ventaLinea)
    await db().delete(venta)
    await db().delete(inventario)
    await db().delete(producto).where(eq(producto.id, PRODUCTO))
  }

  function datosVenta(cambios: Partial<typeof venta.$inferInsert> = {}): typeof venta.$inferInsert {
    return {
      fechaOperacion: "2026-11-02",
      total: "30.00",
      actorId: ACTOR,
      claveSolicitud: crypto.randomUUID(),
      huella: "h",
      ...cambios,
    }
  }

  function datosLinea(ventaId: string, cambios: Partial<typeof ventaLinea.$inferInsert> = {}) {
    return {
      ventaId,
      numeroLinea: 1,
      productoId: PRODUCTO,
      nombreProductoHistorico: "Collar de prueba",
      cantidad: 3,
      precioUnitarioHistorico: "10.00",
      subtotal: "30.00",
      ...cambios,
    } satisfies typeof ventaLinea.$inferInsert
  }

  async function crearVenta(cambios: Partial<typeof venta.$inferInsert> = {}) {
    const [fila] = await db().insert(venta).values(datosVenta(cambios)).returning()
    return fila
  }

  const codigo = (codigoSql: string) => ({ cause: { code: codigoSql } })

  beforeAll(async () => {
    conexion = crearConexionPruebas()
    await db().transaction(sembrarCategorias)
    await db().execute(sql`
      INSERT INTO "user" (id, name, email) VALUES (${ACTOR}, 'Prueba', 'prueba-ventas@ejemplo.com')
      ON CONFLICT (id) DO NOTHING`)
  })

  beforeEach(async () => {
    await limpiar()
    await db().transaction(async (tx) => {
      await insertarProductoOcultoConSaldo(
        tx,
        PRODUCTO,
        { nombre: "Collar de prueba", precio: "10.00", categoriaCodigo: "collares" },
        crearContratoInventario(db()).crearSaldoCero,
      )
    })
  })

  afterEach(limpiar)

  afterAll(async () => {
    if (!conexion) return
    try {
      await limpiar()
      await db().execute(sql`DELETE FROM "user" WHERE id = ${ACTOR}`)
    } finally {
      await conexion.pool.end()
    }
  })

  describe("venta", () => {
    it("guarda una venta sin comprador, confirmada y con fecha de carga automatica", async () => {
      const fila = await crearVenta()

      expect(fila).toMatchObject({
        comprador: null, estado: "CONFIRMADA", fechaOperacion: "2026-11-02", total: "30.00", anuladoEn: null,
      })
      expect(fila.creadoEn).toBeInstanceOf(Date)
    })

    it("rechaza un estado invalido, un comprador vacio y un total negativo", async () => {
      await expect(crearVenta({ estado: "BORRADOR" })).rejects.toMatchObject(codigo("23514"))
      await expect(crearVenta({ comprador: "   " })).rejects.toMatchObject(codigo("23514"))
      await expect(crearVenta({ total: "-1.00" })).rejects.toMatchObject(codigo("23514"))
    })

    it("exige que anulada y fecha/actor de anulacion vayan juntos", async () => {
      await expect(crearVenta({ estado: "ANULADA" })).rejects.toMatchObject(codigo("23514"))
      await expect(crearVenta({ anuladoEn: new Date(), anuladoPorId: ACTOR })).rejects.toMatchObject(codigo("23514"))

      const anulada = await crearVenta({ estado: "ANULADA", anuladoEn: new Date(), anuladoPorId: ACTOR })

      expect(anulada.estado).toBe("ANULADA")
    })

    it("no admite dos ventas con la misma clave de solicitud", async () => {
      const clave = crypto.randomUUID()
      await crearVenta({ claveSolicitud: clave })

      await expect(crearVenta({ claveSolicitud: clave })).rejects.toMatchObject(codigo("23505"))
    })
  })

  describe("venta_linea", () => {
    it("guarda la linea con nombre y precio historicos", async () => {
      const { id } = await crearVenta()

      const [fila] = await db().insert(ventaLinea).values(datosLinea(id)).returning()

      expect(fila).toMatchObject({
        nombreProductoHistorico: "Collar de prueba", precioUnitarioHistorico: "10.00", subtotal: "30.00", cantidad: 3,
      })
    })

    it("rechaza cantidad no positiva, numero de linea invalido y nombre vacio", async () => {
      const { id } = await crearVenta()

      await expect(db().insert(ventaLinea).values(datosLinea(id, { cantidad: 0, subtotal: "0.00" }))).rejects.toMatchObject(codigo("23514"))
      await expect(db().insert(ventaLinea).values(datosLinea(id, { numeroLinea: 0 }))).rejects.toMatchObject(codigo("23514"))
      await expect(db().insert(ventaLinea).values(datosLinea(id, { nombreProductoHistorico: " " }))).rejects.toMatchObject(codigo("23514"))
    })

    it("exige que el subtotal sea cantidad por precio, sin redondeos", async () => {
      const { id } = await crearVenta()

      await expect(db().insert(ventaLinea).values(datosLinea(id, { subtotal: "29.99" }))).rejects.toMatchObject(codigo("23514"))
      await expect(
        db().insert(ventaLinea).values(datosLinea(id, { cantidad: 3, precioUnitarioHistorico: "0.10", subtotal: "0.30" })),
      ).resolves.toBeDefined()
    })

    it("no repite el numero de linea dentro de la misma venta", async () => {
      const { id } = await crearVenta()
      await db().insert(ventaLinea).values(datosLinea(id))

      await expect(db().insert(ventaLinea).values(datosLinea(id))).rejects.toMatchObject(codigo("23505"))
    })

    it("conserva la venta y la linea ante un cambio posterior del precio del producto", async () => {
      const { id } = await crearVenta()
      await db().insert(ventaLinea).values(datosLinea(id))

      await db().update(producto).set({ precio: "99.00" }).where(eq(producto.id, PRODUCTO))

      const [linea] = await db().select().from(ventaLinea).where(eq(ventaLinea.ventaId, id))
      expect(linea).toMatchObject({ precioUnitarioHistorico: "10.00", subtotal: "30.00" })
    })

    it("las referencias comerciales son restrictivas: no se borra un producto ni una venta con lineas", async () => {
      const { id } = await crearVenta()
      await db().insert(ventaLinea).values(datosLinea(id))

      // 23001 = restrict_violation, el codigo de ON DELETE RESTRICT.
      await expect(db().delete(producto).where(eq(producto.id, PRODUCTO))).rejects.toMatchObject(codigo("23001"))
      await expect(db().delete(venta).where(eq(venta.id, id))).rejects.toMatchObject(codigo("23001"))
    })
  })
})
