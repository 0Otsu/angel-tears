import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { sql } from "drizzle-orm"
import type { ConexionBd } from "@/lib/infraestructura/conexion-bd"
import { ErrorSesionRequerida, type ExigirAdministradora } from "@/lib/modulos/autenticacion/contrato"
import { crearAdministracionProveedores } from "@/lib/modulos/proveedores/administracion"
import { crearConexionPruebas } from "@/pruebas/arnes-bd"

// Administracion de Proveedores contra PostgreSQL real (tareas 3.1, 3.2 y 3.3): la Administradora
// se exige antes de cada lectura o efecto, sin baja fisica y con control de version.

const encabezados = new Headers()
const conSesion: ExigirAdministradora = async () => ({ id: "admin-proveedores", nombre: "Administradora", email: "admin@ejemplo.com" })
const sinSesion: ExigirAdministradora = async () => { throw new ErrorSesionRequerida() }

describe("administracion de proveedores sobre PostgreSQL", () => {
  let conexion: ConexionBd | undefined
  const db = () => {
    if (!conexion) throw new Error("La conexion de pruebas no esta disponible.")
    return conexion.db
  }
  const administracion = (exigir: ExigirAdministradora = conSesion) => crearAdministracionProveedores({ db: db(), exigir })
  const contar = async () => Number((await db().execute(sql`SELECT count(*) AS n FROM proveedor`)).rows[0].n)

  async function crear(nombre: string) {
    const r = await administracion().crear(encabezados, { nombre })
    if (r.estado !== "ok") throw new Error(`Se esperaba ok y fue ${r.estado}`)
    return r.proveedor
  }

  beforeAll(() => { conexion = crearConexionPruebas() })
  beforeEach(async () => { await db().execute(sql`DELETE FROM proveedor`) })
  afterAll(async () => {
    if (!conexion) return
    try { await db().execute(sql`DELETE FROM proveedor`) } finally { await conexion.pool.end() }
  })

  it("crea con solo el nombre y devuelve un DTO apto para el cliente", async () => {
    const creado = await crear("  Mayorista Sol ")

    expect(creado).toMatchObject({ nombre: "Mayorista Sol", telefono: null, instagram: null, nota: null, activo: true, version: 1 })
    expect(typeof creado.actualizadoEn).toBe("string")
  })

  it("rechaza un nombre vacio con error por campo y no guarda nada", async () => {
    const r = await administracion().crear(encabezados, { nombre: "   ", telefono: "11 5555" })

    expect(r).toMatchObject({ estado: "datos_invalidos", errores: { nombre: expect.any(String) } })
    expect(await contar()).toBe(0)
  })

  it("lista activos e inactivos ordenados por nombre", async () => {
    const b = await crear("Beta")
    await crear("Alfa")
    await administracion().cambiarActividad(encabezados, { id: b.id, version: b.version }, false)

    const lista = await administracion().consultar(encabezados)

    expect(lista.map((p) => [p.nombre, p.activo])).toEqual([["Alfa", true], ["Beta", false]])
  })

  it("modifica con la version vigente y rechaza una version vieja sin pisar nada", async () => {
    const p = await crear("Original")
    const ok = await administracion().modificar(encabezados, { id: p.id, version: p.version }, { nombre: "Nuevo", instagram: "@nuevo" })
    expect(ok).toMatchObject({ estado: "ok", proveedor: { nombre: "Nuevo", instagram: "@nuevo", version: 2 } })

    const viejo = await administracion().modificar(encabezados, { id: p.id, version: p.version }, { nombre: "Pisado" })

    expect(viejo).toMatchObject({ estado: "conflicto_version", proveedor: { nombre: "Nuevo", version: 2 } })
    expect((await administracion().consultar(encabezados))[0].nombre).toBe("Nuevo")
  })

  it("dos ediciones simultaneas con la misma version no se pisan", async () => {
    const p = await crear("Base")
    const resultados = await Promise.all(["A", "B"].map((nombre) => administracion().modificar(encabezados, { id: p.id, version: p.version }, { nombre })))
    expect(resultados.map((r) => r.estado).sort()).toEqual(["conflicto_version", "ok"])
  })

  it("inactiva y reactiva conservando el proveedor y sus datos", async () => {
    const p = await crear("Con historia")
    const inactivo = await administracion().cambiarActividad(encabezados, { id: p.id, version: p.version }, false)
    expect(inactivo).toMatchObject({ estado: "ok", proveedor: { activo: false, version: 2, nombre: "Con historia" } })
    const reactivado = await administracion().cambiarActividad(encabezados, { id: p.id, version: 2 }, true)
    expect(reactivado).toMatchObject({ estado: "ok", proveedor: { activo: true, version: 3 } })
    expect(await contar()).toBe(1)
  })

  it("informa un proveedor inexistente o una referencia mal formada como no_encontrado", async () => {
    expect(await administracion().modificar(encabezados, { id: crypto.randomUUID(), version: 1 }, { nombre: "X" })).toEqual({ estado: "no_encontrado" })
    expect(await administracion().modificar(encabezados, { id: "no-uuid", version: 1 }, { nombre: "X" })).toEqual({ estado: "no_encontrado" })
    expect(await administracion().cambiarActividad(encabezados, { id: crypto.randomUUID(), version: 1 }, false)).toEqual({ estado: "no_encontrado" })
  })

  it("sin sesion no lee ni modifica nada", async () => {
    const p = await crear("Protegido")

    await expect(administracion(sinSesion).consultar(encabezados)).rejects.toBeInstanceOf(ErrorSesionRequerida)
    expect(await administracion(sinSesion).crear(encabezados, { nombre: "Intruso" })).toEqual({ estado: "sesion_requerida" })
    expect(await administracion(sinSesion).modificar(encabezados, { id: p.id, version: 1 }, { nombre: "Intruso" })).toEqual({ estado: "sesion_requerida" })
    expect(await administracion(sinSesion).cambiarActividad(encabezados, { id: p.id, version: 1 }, false)).toEqual({ estado: "sesion_requerida" })
    expect(await contar()).toBe(1)
    expect((await administracion().consultar(encabezados))[0]).toMatchObject({ nombre: "Protegido", activo: true, version: 1 })
  })
})
