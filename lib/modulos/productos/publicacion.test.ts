import { describe, expect, it, vi } from "vitest"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import { crearExigirAdministradora } from "@/lib/modulos/autenticacion/contrato"
import { crearPublicacionProductos } from "./publicacion"

describe("frontera de comandos de publicacion", () => {
  it("sin sesion no accede a DB ni valida entrada", async () => {
    const transaction = vi.fn()
    const db = { transaction } as unknown as NodePgDatabase
    const comando = crearPublicacionProductos({ db, exigir: crearExigirAdministradora(async () => null) })
    expect(await comando(new Headers(), null)).toEqual({ estado: "sesion_requerida" })
    expect(transaction).not.toHaveBeenCalled()
  })
  it("fallo tecnico del verificador se propaga sin conceder acceso", async () => {
    const transaction = vi.fn()
    const db = { transaction } as unknown as NodePgDatabase
    const comando = crearPublicacionProductos({ db, exigir: async () => { throw new Error("verificador no disponible") } })
    await expect(comando(new Headers(), {})).rejects.toThrow("verificador no disponible")
    expect(transaction).not.toHaveBeenCalled()
  })
  it("un comando invalido autorizado no abre transaccion", async () => {
    const transaction = vi.fn()
    const db = { transaction } as unknown as NodePgDatabase
    const comando = crearPublicacionProductos({ db, exigir: crearExigirAdministradora(async () => ({ id: "admin", nombre: "Admin", email: "admin@example.test" })) })
    expect(await comando(new Headers(), { id: crypto.randomUUID(), version: 1, accion: "borrar" })).toEqual({ estado: "datos_invalidos" })
    expect(transaction).not.toHaveBeenCalled()
  })
})
