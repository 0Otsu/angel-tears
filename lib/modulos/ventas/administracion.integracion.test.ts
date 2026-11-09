import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { eq, inArray, sql } from "drizzle-orm"
import type { ConexionBd } from "@/lib/infraestructura/conexion-bd"
import { ajusteStock, inventario, movimientoStock } from "@/lib/infraestructura/esquemas/inventario"
import { producto } from "@/lib/infraestructura/esquemas/producto"
import { venta, ventaLinea } from "@/lib/infraestructura/esquemas/venta"
import { ErrorSesionRequerida, type ExigirAdministradora } from "@/lib/modulos/autenticacion/contrato"
import { crearAdministracionInventario } from "@/lib/modulos/inventario/administracion"
import { crearContratoInventario } from "@/lib/modulos/inventario/persistencia"
import { crearConsultarProductosInternos } from "@/lib/modulos/productos/consulta-interna"
import { insertarProductoOcultoConSaldo, leerProductosInternos, sembrarCategorias } from "@/lib/modulos/productos/persistencia"
import { crearAdministracionVentas } from "@/lib/modulos/ventas/administracion"
import { crearConexionPruebas } from "@/pruebas/arnes-bd"

// Administracion de Ventas contra PostgreSQL real (change implement-sales, 5.1 y 5.2): cada caso
// de uso exige la Administradora en el servidor antes de cualquier lectura o efecto.

const ACTOR = "usuario-prueba-admin-ventas"
const PRODUCTO_A = "a6060606-6060-4606-8606-606060606061"
const PRODUCTO_B = "b7070707-7070-4707-8707-707070707072"

const encabezados = new Headers()
const conSesion: ExigirAdministradora = async () => ({ id: ACTOR, nombre: "Administradora de prueba", email: "admin-ventas@ejemplo.com" })
const sinSesion: ExigirAdministradora = async () => { throw new ErrorSesionRequerida() }

describe("administracion de ventas sobre PostgreSQL", () => {
  let conexion: ConexionBd | undefined
  const db = () => {
    if (!conexion) throw new Error("La conexion de pruebas no esta disponible.")
    return conexion.db
  }

  function administracion(exigir: ExigirAdministradora = conSesion) {
    const contrato = crearContratoInventario(db())
    return crearAdministracionVentas({
      db: db(),
      exigir,
      contrato,
      consultarProductos: crearConsultarProductosInternos(exigir, (ids) => leerProductosInternos(db(), ids)),
      consultarSaldos: async (cabeceras) =>
        (await crearAdministracionInventario({ db: db(), exigir, contrato }).consultar(cabeceras)).filas,
    })
  }

  async function limpiar() {
    await db().delete(movimientoStock)
    await db().delete(ajusteStock)
    await db().delete(ventaLinea)
    await db().delete(venta)
    await db().delete(inventario)
    await db().delete(producto).where(inArray(producto.id, [PRODUCTO_A, PRODUCTO_B]))
  }

  const saldoDe = async (id: string) => (await db().select().from(inventario).where(eq(inventario.productoId, id)))[0].cantidad
  const entrada = (cambios: Record<string, unknown> = {}) => ({
    claveSolicitud: crypto.randomUUID(),
    fechaOperacion: "2026-11-05",
    comprador: "",
    lineas: [{ productoId: PRODUCTO_A, cantidad: "2" }],
    ...cambios,
  })

  beforeAll(async () => {
    conexion = crearConexionPruebas()
    await db().transaction(sembrarCategorias)
    await db().execute(sql`
      INSERT INTO "user" (id, name, email) VALUES (${ACTOR}, 'Administradora de prueba', 'admin-ventas@ejemplo.com')
      ON CONFLICT (id) DO NOTHING`)
  })

  beforeEach(async () => {
    await limpiar()
    for (const [id, nombre, precio] of [[PRODUCTO_B, "Pulsera", "0.10"], [PRODUCTO_A, "Anillo", "10.10"]]) {
      await db().transaction((tx) =>
        insertarProductoOcultoConSaldo(tx, id, { nombre, precio, categoriaCodigo: "collares" }, crearContratoInventario(db()).crearSaldoCero))
      await db().update(inventario).set({ cantidad: 5 }).where(eq(inventario.productoId, id))
    }
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

  describe("sin sesion", () => {
    it("los comandos devuelven sesion_requerida y no producen ningun efecto", async () => {
      const a = administracion(sinSesion)
      const vendida = await administracion().registrar(encabezados, entrada())
      if (vendida.estado !== "ok") throw new Error("preparacion")

      expect(await a.registrar(encabezados, entrada())).toEqual({ estado: "sesion_requerida" })
      expect(await a.anular(encabezados, vendida.venta.id)).toEqual({ estado: "sesion_requerida" })
      expect(await a.detalle(encabezados, vendida.venta.id)).toEqual({ estado: "sesion_requerida" })
      expect(await db().select().from(venta)).toHaveLength(1)
      expect(await db().select().from(movimientoStock).where(eq(movimientoStock.tipo, "REVERSA"))).toHaveLength(0)
      expect(await saldoDe(PRODUCTO_A)).toBe(3)
    })

    it("las lecturas rechazan con ErrorSesionRequerida", async () => {
      const a = administracion(sinSesion)

      await expect(a.listar(encabezados)).rejects.toBeInstanceOf(ErrorSesionRequerida)
      await expect(a.resumir(encabezados)).rejects.toBeInstanceOf(ErrorSesionRequerida)
      await expect(a.productosParaVender(encabezados)).rejects.toBeInstanceOf(ErrorSesionRequerida)
    })
  })

  describe("registrar", () => {
    it("registra con cantidades de formulario como texto y comprador vacio como Consumidor Final", async () => {
      const resultado = await administracion().registrar(encabezados, entrada())

      expect(resultado).toMatchObject({ estado: "ok", repetido: false, venta: { comprador: null, total: "20.20" } })
      expect(await saldoDe(PRODUCTO_A)).toBe(3)
    })

    it("devuelve los errores de campo y de cada linea para marcarlos en el formulario", async () => {
      const resultado = await administracion().registrar(
        encabezados,
        entrada({ fechaOperacion: "ayer", lineas: [{ productoId: PRODUCTO_A, cantidad: "2" }, { productoId: "x", cantidad: "0" }] }),
      )

      expect(resultado).toEqual({
        estado: "datos_invalidos",
        errores: {
          fechaOperacion: "Ingresá una fecha válida.",
          porLinea: [{ linea: 1, productoId: "Elegí un producto.", cantidad: "Ingresá una cantidad entera mayor a cero." }],
        },
      })
      expect(await db().select().from(venta)).toHaveLength(0)
    })

    it("exige una clave de solicitud valida y una venta con lineas", async () => {
      expect(await administracion().registrar(encabezados, entrada({ claveSolicitud: "no" }))).toEqual({
        estado: "datos_invalidos", errores: { claveSolicitud: "Recargá la página e intentá de nuevo." },
      })
      expect(await administracion().registrar(encabezados, entrada({ lineas: [] }))).toEqual({
        estado: "datos_invalidos", errores: { lineas: "Agregá al menos un producto." },
      })
      expect(await administracion().registrar(encabezados, "basura")).toMatchObject({ estado: "datos_invalidos" })
    })

    it("informa el stock disponible y conserva todo sin efectos", async () => {
      const resultado = await administracion().registrar(
        encabezados,
        entrada({ lineas: [{ productoId: PRODUCTO_A, cantidad: "9" }] }),
      )

      expect(resultado).toEqual({ estado: "stock_insuficiente", productoId: PRODUCTO_A, disponible: 5, requerido: 9 })
      expect(await db().select().from(venta)).toHaveLength(0)
      expect(await saldoDe(PRODUCTO_A)).toBe(5)
    })

    it("reintentar la misma solicitud devuelve lo ya registrado como repetido", async () => {
      const mismo = entrada()
      await administracion().registrar(encabezados, mismo)

      const segunda = await administracion().registrar(encabezados, mismo)

      expect(segunda).toMatchObject({ estado: "ok", repetido: true })
      expect(await saldoDe(PRODUCTO_A)).toBe(3)
    })
  })

  describe("anular y consultar", () => {
    it("anula una vez, informa ya_anulada despues y rechaza un ID invalido", async () => {
      const vendida = await administracion().registrar(encabezados, entrada())
      if (vendida.estado !== "ok") throw new Error("preparacion")

      const anulada = await administracion().anular(encabezados, vendida.venta.id)
      const otra = await administracion().anular(encabezados, vendida.venta.id)
      const invalida = await administracion().anular(encabezados, "no-es-uuid")

      expect(anulada).toMatchObject({ estado: "ok", venta: { estado: "ANULADA" } })
      expect(otra).toMatchObject({ estado: "ya_anulada", venta: { estado: "ANULADA" } })
      expect(invalida).toEqual({ estado: "no_encontrada" })
      expect(await saldoDe(PRODUCTO_A)).toBe(5)
    })

    it("lista y detalla, incluidas las anuladas", async () => {
      const vendida = await administracion().registrar(encabezados, entrada())
      if (vendida.estado !== "ok") throw new Error("preparacion")
      await administracion().anular(encabezados, vendida.venta.id)

      const listado = await administracion().listar(encabezados, { estado: "ANULADA" })
      const detalle = await administracion().detalle(encabezados, vendida.venta.id)

      expect(listado).toMatchObject({ estado: "ok", ventas: [{ id: vendida.venta.id, estado: "ANULADA", comprador: null }] })
      expect(detalle).toMatchObject({ estado: "ok", venta: { id: vendida.venta.id, lineas: [{ cantidad: 2 }] } })
    })
  })

  describe("productos para vender", () => {
    it("lista los productos internos, ocultos incluidos, con precio vigente y saldo, ordenados por nombre", async () => {
      await db().update(inventario).set({ cantidad: 0 }).where(eq(inventario.productoId, PRODUCTO_B))

      const productos = (await administracion().productosParaVender(encabezados)).filter((p) =>
        [PRODUCTO_A, PRODUCTO_B].includes(p.productoId))

      expect(productos.map((p) => [p.nombre, p.precio, p.saldo])).toEqual([
        ["Anillo", "10.10", 5],
        ["Pulsera", "0.10", 0],
      ])
    })
  })
})
