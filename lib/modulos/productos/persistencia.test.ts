import { describe, expect, it, vi } from "vitest"
import { Client } from "pg"
import { drizzle } from "drizzle-orm/node-postgres"
import {
  consultaProductosInternos, insertarProductoOcultoConSaldo, leerProductosInternos, sembrarCategorias,
} from "@/lib/modulos/productos/persistencia"
import { ID_PRODUCTO_PRUEBA } from "@/pruebas/fixtures/productos"

// Doble SOLO del transporte pg para probar SQL parametrizado y orquestacion. No es otra
// conexion de aplicacion ni demuestra constraints/rollback/concurrencia de PostgreSQL.
function transporte(insercionesSinResultado = 0) {
  const cliente = new Client()
  const solicitudes: { text: string; parametros: unknown[] }[] = []
  const query = vi.fn(async (configuracion: string | { text: string }, parametros: unknown[] = []) => {
    const text = typeof configuracion === "string" ? configuracion : configuracion.text
    solicitudes.push({ text, parametros })
    const insertaProducto = text.startsWith('insert into "producto"')
    const omitir = insertaProducto && insercionesSinResultado-- > 0
    return { rows: insertaProducto && !omitir ? [[ID_PRODUCTO_PRUEBA]] : [], rowCount: omitir ? 0 : 1, fields: [], command: "", oid: 0 }
  })
  // La interfaz pg tiene sobrecargas para callbacks; Drizzle usa la promesa probada aqui.
  cliente.query = query as unknown as Client["query"]
  return { bd: drizzle(cliente), solicitudes }
}

const entrada = { nombre: "Collar", precio: "10.05", categoriaCodigo: "collares", publicado: true, saldo: 99 }

describe("adaptador Producto preparado sobre Drizzle/pg existente", () => {
  it("compone consulta batched parametrizada, sin filtro de ocultos ni campos de stock", () => {
    const consulta = consultaProductosInternos(drizzle.mock(), [ID_PRODUCTO_PRUEBA]).toSQL()
    expect(consulta.params).toEqual([ID_PRODUCTO_PRUEBA])
    expect(consulta.sql).toContain('inner join "categoria"')
    expect(consulta.sql).not.toContain(ID_PRODUCTO_PRUEBA)
    expect(consulta.sql).not.toContain('"saldo"')
    expect(consulta.sql).not.toContain('"minimo"')
    expect(consulta.sql).not.toMatch(/where.*publicado/)
  })

  it("evita SQL si no hay IDs", async () => {
    const { bd, solicitudes } = transporte()
    expect(await leerProductosInternos(bd, [])).toEqual([])
    expect(solicitudes).toEqual([])
  })

  it("siembra categorias de forma explicita y repetible sin borrar o reescribir existentes", async () => {
    const { bd, solicitudes } = transporte()
    await bd.transaction(async (tx) => { await sembrarCategorias(tx); await sembrarCategorias(tx) })
    const semillas = solicitudes.filter((s) => s.text.startsWith('insert into "categoria"'))
    expect(semillas).toHaveLength(2)
    expect(semillas[0].parametros).toContain("aros-piercings")
    expect(semillas[0].text).toContain('on conflict ("codigo") do nothing')
    expect(semillas[0].text).not.toContain("delete")
  })

  it("inserta oculto, sin stock propio, y pasa exactamente la tx del llamador a C0", async () => {
    const { bd, solicitudes } = transporte()
    const crearSaldoCero = vi.fn(async () => undefined)
    await bd.transaction(async (tx) => {
      expect(await insertarProductoOcultoConSaldo(tx, ID_PRODUCTO_PRUEBA, entrada, crearSaldoCero)).toBe(ID_PRODUCTO_PRUEBA)
      expect(crearSaldoCero).toHaveBeenCalledExactlyOnceWith(tx, ID_PRODUCTO_PRUEBA)
    })
    const insercion = solicitudes.find((s) => s.text.startsWith('insert into "producto"'))!
    expect(insercion.parametros).toContain("10.05")
    expect(insercion.parametros.filter((p) => p === false)).toHaveLength(2)
    expect(insercion.text).not.toContain('"saldo"')
    expect(solicitudes.at(-1)?.text).toBe("commit")
  })

  it("resuelve colision de slug en INSERT sin lectura previa ni renombrar al existente", async () => {
    const { bd, solicitudes } = transporte(1)
    const saldo = vi.fn(async () => undefined)
    await bd.transaction((tx) => insertarProductoOcultoConSaldo(tx, ID_PRODUCTO_PRUEBA, entrada, saldo))
    const inserciones = solicitudes.filter((s) => s.text.startsWith('insert into "producto"'))
    expect(inserciones).toHaveLength(2)
    expect(inserciones[0].parametros).toContain("collar")
    expect(inserciones[1].parametros).toContain(`collar-${ID_PRODUCTO_PRUEBA}`)
    expect(inserciones.every((s) => s.text.includes('on conflict ("slug") do nothing'))).toBe(true)
    expect(saldo).toHaveBeenCalledTimes(1)
  })

  it("usa un fallback en minusculas compatible con el CHECK al colisionar con UUID en mayusculas", async () => {
    const { bd, solicitudes } = transporte(1)
    const saldo = vi.fn(async () => undefined)
    const idMayusculas = ID_PRODUCTO_PRUEBA.toUpperCase()

    await bd.transaction((tx) => insertarProductoOcultoConSaldo(tx, idMayusculas, entrada, saldo))

    const inserciones = solicitudes.filter((s) => s.text.startsWith('insert into "producto"'))
    expect(inserciones).toHaveLength(2)
    expect(inserciones[0].parametros).toContain("collar")
    const fallback = inserciones[1].parametros.find((p) => typeof p === "string" && p.startsWith("collar-"))
    expect(fallback).toBe(`collar-${ID_PRODUCTO_PRUEBA}`)
    // Mismo formato que producto_slug_formato; no sustituye la prueba SQL pendiente.
    expect(fallback).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    expect(saldo).toHaveBeenCalledTimes(1)
  })

  it("propaga fallo de C0 y solicita rollback de la tx, sin commit ni manejo parcial", async () => {
    const { bd, solicitudes } = transporte()
    await expect(bd.transaction((tx) => insertarProductoOcultoConSaldo(tx, ID_PRODUCTO_PRUEBA, entrada,
      async () => { throw new Error("C0 no disponible") },
    ))).rejects.toThrow("C0 no disponible")
    expect(solicitudes.at(-1)?.text).toBe("rollback")
    expect(solicitudes.some((s) => s.text === "commit")).toBe(false)
  })

  it("no crea saldo si fallan validacion o reserva de ambos candidatos", async () => {
    const { bd } = transporte(2)
    const saldo = vi.fn(async () => undefined)
    await expect(bd.transaction((tx) => insertarProductoOcultoConSaldo(tx, ID_PRODUCTO_PRUEBA, entrada, saldo)))
      .rejects.toThrow("URL unica")
    await expect(bd.transaction((tx) => insertarProductoOcultoConSaldo(tx, ID_PRODUCTO_PRUEBA, { ...entrada, precio: "1.001" }, saldo)))
      .rejects.toThrow()
    expect(saldo).not.toHaveBeenCalled()
  })
})
