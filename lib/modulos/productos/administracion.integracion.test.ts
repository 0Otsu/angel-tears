import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { eq, sql } from "drizzle-orm"
import type { ConexionBd } from "@/lib/infraestructura/conexion-bd"
import { categoria, producto } from "@/lib/infraestructura/esquemas/producto"
import { inventario } from "@/lib/infraestructura/esquemas/inventario"
import { crearExigirAdministradora } from "@/lib/modulos/autenticacion/contrato"
import { crearVerificadorDeSesion } from "@/lib/modulos/autenticacion/verificador-better-auth"
import { crearAuth } from "@/lib/infraestructura/auth-config"
import { aprovisionarAdministradora } from "@/lib/modulos/autenticacion/aprovisionar-administradora"
import { crearContratoInventario } from "@/lib/modulos/inventario/persistencia"
import { crearConexionPruebas } from "@/pruebas/arnes-bd"
import { crearAdministracionProductos } from "./administracion"
import { sembrarCategorias } from "./persistencia"

const entrada = { nombre: "Collar", precio: "1250.50", categoriaCodigo: "collares" }
const encabezados = new Headers()
const identidad = { id: "admin-productos-21", nombre: "Administradora", email: "productos-21@ejemplo.com" }

describe("administracion Producto 2.1 sobre PostgreSQL", () => {
  let conexion: ConexionBd
  const db = () => conexion.db
  const c0 = () => crearContratoInventario(db()).crearSaldoCero
  const servicio = () => crearAdministracionProductos({ db: db(), exigir: crearExigirAdministradora(async () => identidad), crearSaldoCero: c0() })
  async function limpiar() {
    await db().delete(inventario)
    await db().delete(producto)
    await db().delete(categoria)
  }
  async function crear(entradaProducto: unknown = entrada) {
    const resultado = await servicio().crear(encabezados, entradaProducto)
    if (resultado.estado !== "ok") throw new Error(`Alta no confirmada: ${resultado.estado}`)
    return resultado.productoId
  }

  beforeAll(() => { conexion = crearConexionPruebas() })
  beforeEach(async () => { await limpiar(); await db().transaction(sembrarCategorias) })
  afterAll(async () => { if (conexion) { await limpiar(); await conexion.pool.end() } })

  it("sin sesion rechaza alta/edicion y consulta antes de acceder a datos", async () => {
    const sinSesion = crearAdministracionProductos({ db: db(), exigir: crearExigirAdministradora(async () => null), crearSaldoCero: c0() })
    expect(await sinSesion.crear(encabezados, entrada)).toEqual({ estado: "sesion_requerida" })
    expect(await sinSesion.editar(encabezados, {}, entrada)).toEqual({ estado: "sesion_requerida" })
    await expect(sinSesion.consultar(encabezados)).rejects.toMatchObject({ codigo: "SESION_REQUERIDA" })
    expect(await db().select().from(producto)).toEqual([])
  })

  it("crea oculto, no destacado y sin imagen, con saldo cero/minimo null real", async () => {
    const id = await crear({ ...entrada, publicado: true, destacado: true, slug: "intruso", saldo: 500 })
    const [guardado] = await db().select().from(producto).where(eq(producto.id, id))
    const [saldo] = await db().select().from(inventario).where(eq(inventario.productoId, id))
    expect(guardado).toMatchObject({ nombre: "Collar", precio: "1250.50", publicado: false, destacado: false, imagenAssetId: null, descripcion: null })
    expect(guardado.slug).toBe("collar")
    expect(saldo).toMatchObject({ cantidad: 0, minimo: null })
  })

  it("si C0 falla despues de insertar saldo, revierte ambos registros", async () => {
    const fallido = crearAdministracionProductos({ db: db(), exigir: crearExigirAdministradora(async () => identidad), crearSaldoCero: async (tx, id) => {
      await c0()(tx, id)
      throw new Error("fallo C0 deliberado")
    } })
    await expect(fallido.crear(encabezados, entrada)).rejects.toThrow("fallo C0 deliberado")
    expect(await db().select().from(producto)).toEqual([])
    expect(await db().select().from(inventario)).toEqual([])
  })

  it.each(["nombre", "precio", "categoriaCodigo"])("rechaza obligatorio %s sin persistir", async (campo) => {
    const datos: Record<string, unknown> = { ...entrada }
    delete datos[campo]
    expect(await servicio().crear(encabezados, datos)).toMatchObject({ estado: "datos_invalidos", errores: { [campo]: expect.any(String) } })
    expect(await db().select().from(producto)).toEqual([])
  })

  it.each(["0", "-1.20", "1.001", "99999999999999999", "1,50"])("rechaza precio %s sin redondeo ni efectos", async (precio) => {
    expect(await servicio().crear(encabezados, { ...entrada, precio })).toMatchObject({ estado: "datos_invalidos", errores: { precio: expect.any(String) } })
    expect(await db().select().from(producto)).toEqual([])
  })

  it("conserva un precio mayor que el rango exacto de number", async () => {
    const id = await crear({ ...entrada, precio: "90071992547409.93" })
    expect((await servicio().consultar(encabezados)).productos.find((p) => p.id === id)?.precio).toBe("90071992547409.93")
  })

  it("rechaza categoria inventada y categoria aprobada ausente de BD", async () => {
    expect(await servicio().crear(encabezados, { ...entrada, categoriaCodigo: "inventada" })).toMatchObject({ estado: "datos_invalidos" })
    await db().delete(categoria).where(eq(categoria.codigo, "collares"))
    expect(await servicio().crear(encabezados, entrada)).toMatchObject({ estado: "datos_invalidos", errores: { categoriaCodigo: expect.any(String) } })
    expect(await db().select().from(inventario)).toEqual([])
  })

  it("consulta los productos reales, incluidos ocultos, sin stock dentro de su DTO", async () => {
    const id = await crear({ ...entrada, descripcion: " Descripción ", material: "acero", medida: "20 cm", color: "plata", cuidados: "secar" })
    const consulta = await servicio().consultar(encabezados)
    expect(consulta.categorias).toHaveLength(7)
    expect(consulta.productos).toMatchObject([{ id, descripcion: "Descripción", material: "acero", medida: "20 cm", color: "plata", cuidados: "secar", publicado: false }])
    expect(consulta.productos[0]).not.toHaveProperty("stock")
    expect(consulta.productos[0]).not.toHaveProperty("cantidad")
    expect(consulta.productos[0]).not.toHaveProperty("minimo")
  })

  it("edita datos/precio con slug estable y conserva flags, imagen, saldo y fecha de alta", async () => {
    const id = await crear()
    await db().update(producto).set({ publicado: true, destacado: true, imagenAssetId: "asset", imagenPublicId: "demo/a", imagenVersionProveedor: "1", imagenUrlSegura: "https://example.test/a.jpg", imagenAncho: 100, imagenAlto: 100, imagenFormato: "jpeg" }).where(eq(producto.id, id))
    const [anterior] = await db().select().from(producto).where(eq(producto.id, id))
    expect(await servicio().editar(encabezados, { id, version: 1 }, { ...entrada, nombre: "Nombre distinto", precio: "23.45", descripcion: "", material: "oro", slug: "intruso", publicado: false, destacado: false })).toEqual({ estado: "ok", productoId: id })
    const [actual] = await db().select().from(producto).where(eq(producto.id, id))
    expect(actual).toMatchObject({ slug: anterior.slug, creadoEn: anterior.creadoEn, nombre: "Nombre distinto", precio: "23.45", descripcion: null, material: "oro", publicado: true, destacado: true, imagenAssetId: "asset", version: 2 })
    expect((await db().select().from(inventario))[0].cantidad).toBe(0)
  })

  it("rechaza edicion invalida, version atrasada e ID inexistente sin alterar datos", async () => {
    const id = await crear()
    expect(await servicio().editar(encabezados, { id, version: 1 }, { ...entrada, precio: "1.009" })).toMatchObject({ estado: "datos_invalidos" })
    expect(await servicio().editar(encabezados, { id, version: 1 }, { ...entrada, nombre: "Primera edición" })).toMatchObject({ estado: "ok" })
    expect(await servicio().editar(encabezados, { id, version: 1 }, { ...entrada, nombre: "Edición obsoleta" })).toEqual({ estado: "conflicto_version" })
    expect(await servicio().editar(encabezados, { id: crypto.randomUUID(), version: 1 }, entrada)).toEqual({ estado: "no_encontrado" })
    expect(await servicio().editar(encabezados, undefined, entrada)).toMatchObject({ estado: "datos_invalidos" })
    expect((await servicio().consultar(encabezados)).productos[0].nombre).toBe("Primera edición")
  })

  it("dos ediciones simultaneas con la misma version no se pisan", async () => {
    const id = await crear()
    const resultados = await Promise.all(["A", "B"].map((nombre) => servicio().editar(encabezados, { id, version: 1 }, { ...entrada, nombre })))
    expect(resultados.map((r) => r.estado).sort()).toEqual(["conflicto_version", "ok"])
  })

  it("consume el verificador Better Auth real, sin crear otra frontera de identidad", async () => {
    await db().execute(sql`DELETE FROM "user"`)
    await db().execute(sql`DELETE FROM rate_limit`)
    try {
      const contrasena = "contrasena-solo-pruebas-productos-21"
      expect(await aprovisionarAdministradora(conexion, { email: identidad.email, nombre: identidad.nombre, contrasena })).toMatchObject({ estado: "creada" })
      const auth = crearAuth(db())
      const origen = process.env.BETTER_AUTH_URL!
      const respuesta = await auth.handler(new Request(`${origen}/api/auth/sign-in/email`, {
        method: "POST", headers: { "content-type": "application/json", origin: origen },
        body: JSON.stringify({ email: identidad.email, password: contrasena }),
      }))
      expect(respuesta.status).toBe(200)
      const cookie = respuesta.headers.getSetCookie().find((c) => c.includes("session_token"))?.split(";")[0]
      expect(cookie).toBeTruthy()
      const real = crearAdministracionProductos({ db: db(), exigir: crearExigirAdministradora(crearVerificadorDeSesion(auth)), crearSaldoCero: c0() })
      const sesion = new Headers({ cookie: cookie! })
      const alta = await real.crear(sesion, entrada)
      expect(alta).toMatchObject({ estado: "ok" })
      expect((await real.consultar(sesion)).productos).toHaveLength(1)
      if (alta.estado === "ok") expect(await real.editar(sesion, { id: alta.productoId, version: 1 }, { ...entrada, precio: "500.01" })).toMatchObject({ estado: "ok" })
      expect(await real.crear(new Headers(), entrada)).toEqual({ estado: "sesion_requerida" })
    } finally {
      await db().execute(sql`DELETE FROM "user" WHERE email = ${identidad.email}`)
      await db().execute(sql`DELETE FROM rate_limit`)
    }
  })
})
