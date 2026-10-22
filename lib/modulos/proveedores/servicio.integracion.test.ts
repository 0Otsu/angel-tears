import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { sql } from "drizzle-orm"
import type { ConexionBd } from "@/lib/infraestructura/conexion-bd"
import {
  cambiarActividadProveedor,
  crearProveedor,
  listarProveedores,
  modificarProveedor,
  obtenerProveedor,
  type ProveedorDto,
} from "@/lib/modulos/proveedores/servicio"
import { crearConexionPruebas } from "@/pruebas/arnes-bd"

// Proveedores contra PostgreSQL real (tareas 3.1 y 3.2): alta, consulta, modificacion,
// inactivacion y control de version.

function proveedorOk(resultado: Awaited<ReturnType<typeof crearProveedor>>): ProveedorDto {
  if (resultado.estado !== "ok") throw new Error(`Se esperaba ok y fue ${resultado.estado}`)
  return resultado.proveedor
}

describe("servicio de proveedores", () => {
  let conexion: ConexionBd | undefined

  function db() {
    if (!conexion) throw new Error("La conexion de pruebas no esta disponible.")
    return conexion.db
  }

  beforeAll(() => {
    conexion = crearConexionPruebas()
  })

  beforeEach(async () => {
    await db().execute(sql`DELETE FROM proveedor`)
  })

  afterAll(async () => {
    await conexion?.pool.end()
  })

  it("crea un proveedor solo con nombre, activo y en version 1", async () => {
    const creado = proveedorOk(await crearProveedor(db(), { nombre: "  Mayorista Sol " }))

    expect(creado).toMatchObject({
      nombre: "Mayorista Sol",
      telefono: null,
      instagram: null,
      nota: null,
      activo: true,
      version: 1,
    })
    expect(await obtenerProveedor(db(), creado.id)).toEqual(creado)
  })

  it("rechaza un nombre ausente con error de campo y no guarda nada", async () => {
    const resultado = await crearProveedor(db(), { nombre: "   ", telefono: "123" })

    expect(resultado).toMatchObject({
      estado: "datos_invalidos",
      errores: [{ campo: "nombre" }],
    })
    expect(await listarProveedores(db())).toHaveLength(0)
  })

  it("modifica datos, incrementa la version y conserva el id", async () => {
    const creado = proveedorOk(await crearProveedor(db(), { nombre: "Viejo" }))

    const resultado = await modificarProveedor(db(), creado.id, creado.version, {
      nombre: "Nuevo",
      instagram: "@nuevo",
    })

    const modificado = proveedorOk(resultado)
    expect(modificado).toMatchObject({ id: creado.id, nombre: "Nuevo", instagram: "@nuevo", version: 2 })
  })

  it("rechaza una edicion con version vieja sin pisar la otra", async () => {
    const creado = proveedorOk(await crearProveedor(db(), { nombre: "Base" }))
    await modificarProveedor(db(), creado.id, 1, { nombre: "Primera edicion" })

    const resultado = await modificarProveedor(db(), creado.id, 1, { nombre: "Segunda, desactualizada" })

    expect(resultado).toMatchObject({
      estado: "conflicto_version",
      proveedor: { nombre: "Primera edicion", version: 2 },
    })
  })

  it("dos ediciones simultaneas con la misma version: solo una gana", async () => {
    const creado = proveedorOk(await crearProveedor(db(), { nombre: "Base" }))

    const resultados = await Promise.all([
      modificarProveedor(db(), creado.id, 1, { nombre: "A" }),
      modificarProveedor(db(), creado.id, 1, { nombre: "B" }),
    ])

    expect(resultados.map((r) => r.estado).sort()).toEqual(["conflicto_version", "ok"])
    expect((await obtenerProveedor(db(), creado.id))?.version).toBe(2)
  })

  it("informa no_encontrado para un ID inexistente", async () => {
    const resultado = await modificarProveedor(
      db(),
      "00000000-0000-4000-8000-000000000000",
      1,
      { nombre: "X" },
    )

    expect(resultado).toEqual({ estado: "no_encontrado" })
  })

  it("inactivar excluye al proveedor de la seleccion nueva pero lo conserva", async () => {
    const activo = proveedorOk(await crearProveedor(db(), { nombre: "A activo" }))
    const aInactivar = proveedorOk(await crearProveedor(db(), { nombre: "B inactivo" }))

    const inactivo = proveedorOk(
      await cambiarActividadProveedor(db(), aInactivar.id, aInactivar.version, false),
    )

    expect(inactivo).toMatchObject({ nombre: "B inactivo", activo: false })
    expect((await listarProveedores(db(), { soloActivos: true })).map((p) => p.id)).toEqual([activo.id])
    expect(await listarProveedores(db())).toHaveLength(2)
  })

  it("se puede reactivar un proveedor inactivo", async () => {
    const creado = proveedorOk(await crearProveedor(db(), { nombre: "P" }))
    const inactivo = proveedorOk(await cambiarActividadProveedor(db(), creado.id, 1, false))

    const reactivado = proveedorOk(await cambiarActividadProveedor(db(), creado.id, inactivo.version, true))

    expect(reactivado.activo).toBe(true)
  })

  it("lista ordenado por nombre", async () => {
    await crearProveedor(db(), { nombre: "Zeta" })
    await crearProveedor(db(), { nombre: "Alfa" })

    expect((await listarProveedores(db())).map((p) => p.nombre)).toEqual(["Alfa", "Zeta"])
  })
})
