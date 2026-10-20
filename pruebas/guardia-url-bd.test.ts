import { describe, expect, it } from "vitest"
import { validarUrlBdPruebas } from "@/pruebas/guardia-url-bd"

const CONTRASENA = "secreto-que-no-debe-aparecer"
const urlPruebas = `postgresql://angel_tears:${CONTRASENA}@localhost:5432/angel_tears_test`
const urlDesarrollo = `postgresql://angel_tears:${CONTRASENA}@localhost:5432/angel_tears_dev`

function mensajeDeError(accion: () => unknown): string {
  try {
    accion()
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
  throw new Error("Se esperaba que lanzara un error")
}

describe("guard de la base de pruebas", () => {
  it("acepta una base local cuyo nombre termina en _test", () => {
    expect(validarUrlBdPruebas(urlPruebas, urlDesarrollo)).toBe(urlPruebas)
    expect(validarUrlBdPruebas(urlPruebas.replace("localhost", "127.0.0.1"))).toContain("127.0.0.1")
  })

  it("rechaza si no hay URL", () => {
    expect(() => validarUrlBdPruebas(undefined)).toThrow("DATABASE_URL_TEST")
    expect(() => validarUrlBdPruebas("")).toThrow("DATABASE_URL_TEST")
  })

  it("rechaza una URL mal formada o con otro esquema", () => {
    expect(() => validarUrlBdPruebas("no-es-una-url")).toThrow("no es una URL valida")
    expect(() => validarUrlBdPruebas("http://localhost/angel_tears_test")).toThrow("postgresql://")
  })

  it("rechaza hosts que no sean locales", () => {
    const remota = urlPruebas.replace("localhost", "db.ejemplo.com")
    expect(() => validarUrlBdPruebas(remota)).toThrow("base local")
  })

  it("rechaza nombres de base que no terminan en _test", () => {
    const sinSufijo = urlPruebas.replace("angel_tears_test", "angel_tears_dev")
    expect(() => validarUrlBdPruebas(sinSufijo)).toThrow("terminar en _test")
    const otroNombre = urlPruebas.replace("angel_tears_test", "produccion")
    expect(() => validarUrlBdPruebas(otroNombre)).toThrow("terminar en _test")
  })

  it("rechaza que sea la misma base que la de desarrollo", () => {
    expect(() => validarUrlBdPruebas(urlPruebas, urlPruebas)).toThrow("misma base")
  })

  it("nunca incluye la contrasena en los mensajes de error", () => {
    const casos: Array<() => unknown> = [
      () => validarUrlBdPruebas(urlPruebas.replace("localhost", "db.ejemplo.com")),
      () => validarUrlBdPruebas(urlPruebas.replace("angel_tears_test", "produccion")),
      () => validarUrlBdPruebas(urlPruebas, urlPruebas),
      () => validarUrlBdPruebas(urlPruebas.replace("postgresql:", "http:")),
    ]
    for (const caso of casos) {
      expect(mensajeDeError(caso)).not.toContain(CONTRASENA)
    }
  })
})
