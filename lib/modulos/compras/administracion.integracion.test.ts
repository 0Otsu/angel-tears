import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { eq, inArray } from "drizzle-orm"
import type { ConexionBd } from "@/lib/infraestructura/conexion-bd"
import { compra } from "@/lib/infraestructura/esquemas/compra"
import { categoria, producto } from "@/lib/infraestructura/esquemas/producto"
import { ErrorSesionRequerida, type ExigirAdministradora } from "@/lib/modulos/autenticacion/contrato"
import { crearAdministracionCompras } from "@/lib/modulos/compras/administracion"
import { ACTOR_COMPRAS, crearArnesCompras } from "@/pruebas/arnes-compras"
import { crearConexionPruebas } from "@/pruebas/arnes-bd"

// Administracion de Compras contra PostgreSQL real (tareas 4.1 a 4.5): la Administradora se exige
// antes de cada lectura o efecto, con mensajes por campo y sin exponer nada sin sesion.

const PRODUCTO_A = "c5555555-5555-4555-8555-555555555555"
const PRODUCTO_B = "c6666666-6666-4666-8666-666666666666"
const encabezados = new Headers()
const conSesion: ExigirAdministradora = async () => ({ id: ACTOR_COMPRAS, nombre: "Administradora", email: "admin@ejemplo.com" })
const sinSesion: ExigirAdministradora = async () => { throw new ErrorSesionRequerida() }

describe("administracion de compras sobre PostgreSQL", () => {
  let conexion: ConexionBd | undefined
  const arnes = crearArnesCompras(() => {
    if (!conexion) throw new Error("La conexion de pruebas no esta disponible.")
    return conexion
  }, [PRODUCTO_A, PRODUCTO_B])

  const administracion = (exigir: ExigirAdministradora = conSesion) =>
    crearAdministracionCompras({
      db: arnes.db(),
      exigir,
      contrato: arnes.contrato(),
      // Producto se lee por su contrato; aqui, desde la base como lo haria su implementacion real.
      consultarProductos: async (_h, ids) =>
        ids.length === 0 ? [] : arnes.db().select({ id: producto.id, nombre: producto.nombre, categoriaNombre: categoria.nombre })
          .from(producto).innerJoin(categoria, eq(producto.categoriaCodigo, categoria.codigo)).where(inArray(producto.id, [...ids])),
      consultarSaldos: async () => [
        { productoId: PRODUCTO_A, saldo: await arnes.saldoDe(PRODUCTO_A) },
        { productoId: PRODUCTO_B, saldo: await arnes.saldoDe(PRODUCTO_B) },
      ],
    })

  const entrada = (extra: Record<string, unknown> = {}) => ({
    claveSolicitud: crypto.randomUUID(),
    fechaOperacion: "2026-11-03",
    lineas: [{ productoId: PRODUCTO_A, cantidad: "5", costoUnitario: "100.50" }],
    ...extra,
  })

  beforeAll(async () => {
    conexion = crearConexionPruebas()
    await arnes.preparar()
  })
  beforeEach(async () => {
    await arnes.limpiar()
    await arnes.crearProducto(PRODUCTO_A, "Producto A")
    await arnes.crearProducto(PRODUCTO_B, "Producto B")
  })
  afterEach(arnes.limpiar)
  afterAll(async () => {
    if (!conexion) return
    try {
      await arnes.limpiar()
      await arnes.quitarUsuario()
    } finally {
      await conexion.pool.end()
    }
  })

  describe("registrar", () => {
    it("registra con la cantidad como texto y devuelve el detalle", async () => {
      const r = await administracion().registrar(encabezados, entrada())

      expect(r).toMatchObject({ estado: "ok", repetido: false, compra: { total: "502.50", estado: "CONFIRMADA" } })
      expect(await arnes.saldoDe(PRODUCTO_A)).toBe(5)
    })

    it("devuelve mensajes por campo y por linea para el formulario", async () => {
      const r = await administracion().registrar(encabezados, entrada({
        fechaOperacion: "2026-02-30",
        lineas: [{ productoId: PRODUCTO_A, cantidad: "0", costoUnitario: "10.505" }],
      }))

      expect(r).toEqual({
        estado: "datos_invalidos",
        errores: {
          fechaOperacion: "Ingresá una fecha válida.",
          porLinea: [{ linea: 0, cantidad: "Ingresá una cantidad entera mayor a cero.", costoUnitario: "Ingresá un costo válido, con hasta dos decimales." }],
        },
      })
    })

    it("exige una clave de solicitud valida", async () => {
      const r = await administracion().registrar(encabezados, entrada({ claveSolicitud: "x" }))
      expect(r).toMatchObject({ estado: "datos_invalidos", errores: { claveSolicitud: expect.any(String) } })
    })

    it("sin sesion no registra nada", async () => {
      const r = await administracion(sinSesion).registrar(encabezados, entrada())

      expect(r).toEqual({ estado: "sesion_requerida" })
      expect(await arnes.saldoDe(PRODUCTO_A)).toBe(0)
      expect(await arnes.db().select().from(compra)).toHaveLength(0)
    })
  })

  describe("anular, detalle, listar y resumir", () => {
    async function registrada(extra: Record<string, unknown> = {}) {
      const r = await administracion().registrar(encabezados, entrada(extra))
      if (r.estado !== "ok") throw new Error(`Se esperaba ok y fue ${r.estado}`)
      return r.compra
    }

    it("anula y revierte el stock; sin sesion no hace nada", async () => {
      const c = await registrada()

      expect(await administracion(sinSesion).anular(encabezados, c.id)).toEqual({ estado: "sesion_requerida" })
      expect(await arnes.saldoDe(PRODUCTO_A)).toBe(5)
      expect(await administracion().anular(encabezados, c.id)).toMatchObject({ estado: "ok", compra: { estado: "ANULADA" } })
      expect(await arnes.saldoDe(PRODUCTO_A)).toBe(0)
      expect(await administracion().anular(encabezados, c.id)).toMatchObject({ estado: "ya_anulada" })
      expect(await administracion().anular(encabezados, "no-uuid")).toEqual({ estado: "no_encontrada" })
    })

    it("informa la reversion bloqueada con el nombre del producto", async () => {
      const c = await registrada()
      await arnes.fijarSaldo(PRODUCTO_A, 2)

      const r = await administracion().anular(encabezados, c.id)

      expect(r).toEqual({ estado: "reversion_bloqueada", faltantes: [{ productoId: PRODUCTO_A, nombreProducto: "Producto A", disponible: 2, requerido: 5 }] })
    })

    it("detalle: encuentra, no encuentra y exige sesion", async () => {
      const c = await registrada()

      expect(await administracion().detalle(encabezados, c.id)).toMatchObject({ estado: "ok", compra: { id: c.id } })
      expect(await administracion().detalle(encabezados, crypto.randomUUID())).toEqual({ estado: "no_encontrada" })
      expect(await administracion().detalle(encabezados, "x")).toEqual({ estado: "no_encontrada" })
      expect(await administracion(sinSesion).detalle(encabezados, c.id)).toEqual({ estado: "sesion_requerida" })
    })

    it("listar filtra por estado y fecha de operacion, mas recientes primero, e incluye anuladas", async () => {
      const vieja = await registrada({ fechaOperacion: "2026-10-01" })
      await registrada({ fechaOperacion: "2026-11-05" })
      await administracion().anular(encabezados, vieja.id)

      const todas = await administracion().listar(encabezados)
      const anuladas = await administracion().listar(encabezados, { estado: "ANULADA" })
      const noviembre = await administracion().listar(encabezados, { desde: "2026-11-01", hasta: "2026-11-30" })

      expect(todas).toMatchObject({ estado: "ok", compras: [{ fechaOperacion: "2026-11-05" }, { fechaOperacion: "2026-10-01", estado: "ANULADA" }] })
      expect(anuladas.estado === "ok" && anuladas.compras.map((c) => c.id)).toEqual([vieja.id])
      expect(noviembre.estado === "ok" && noviembre.compras).toHaveLength(1)
      expect(await administracion().listar(encabezados, { desde: "2026-11-30", hasta: "2026-11-01" })).toMatchObject({ estado: "datos_invalidos", errores: { hasta: expect.any(String) } })
      expect(await administracion().listar(encabezados, { estado: "X" })).toMatchObject({ estado: "datos_invalidos", errores: { estado: expect.any(String) } })
      await expect(administracion(sinSesion).listar(encabezados)).rejects.toBeInstanceOf(ErrorSesionRequerida)
    })

    it("resumir cuenta una sola vez las compras vigentes y excluye las anuladas del total", async () => {
      await registrada({ fechaOperacion: "2026-11-02" }) // 502.50
      await registrada({ fechaOperacion: "2026-11-03", lineas: [{ productoId: PRODUCTO_B, cantidad: "1", costoUnitario: "0.10" }] })
      const anulada = await registrada({ fechaOperacion: "2026-11-04" })
      await administracion().anular(encabezados, anulada.id)

      const r = await administracion().resumir(encabezados, { desde: "2026-11-01", hasta: "2026-11-30" })

      expect(r).toEqual({ estado: "ok", resumen: { desde: "2026-11-01", hasta: "2026-11-30", vigentes: { cantidad: 2, total: "502.60" }, anuladas: { cantidad: 1 } } })
      await expect(administracion(sinSesion).resumir(encabezados)).rejects.toBeInstanceOf(ErrorSesionRequerida)
    })
  })

  describe("selectores del formulario", () => {
    it("productos con su stock, ordenados por nombre; exige sesion", async () => {
      await arnes.fijarSaldo(PRODUCTO_B, 7)

      const productos = await administracion().productosParaComprar(encabezados)

      expect(productos.map((p) => [p.nombre, p.saldo])).toEqual([["Producto A", 0], ["Producto B", 7]])
      await expect(administracion(sinSesion).productosParaComprar(encabezados)).rejects.toBeInstanceOf(ErrorSesionRequerida)
    })

    it("solo ofrece proveedores activos", async () => {
      await arnes.crearProveedor("Activo")
      await arnes.crearProveedor("Inactivo", false)

      const proveedores = await administracion().proveedoresParaComprar(encabezados)

      expect(proveedores.map((p) => p.nombre)).toContain("Prueba compras Activo")
      expect(proveedores.map((p) => p.nombre)).not.toContain("Prueba compras Inactivo")
      await expect(administracion(sinSesion).proveedoresParaComprar(encabezados)).rejects.toBeInstanceOf(ErrorSesionRequerida)
    })
  })
})
