import { describe, expect, it, vi } from "vitest"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import { crearExigirAdministradora } from "@/lib/modulos/autenticacion/contrato"
import { crearAdministracionProductos } from "./administracion"

describe("frontera privada de Producto 2.1", () => {
  it("sin sesion no ejecuta ninguna lectura, transaccion ni C0, incluso con entrada invalida", async () => {
    const select = vi.fn(() => { throw new Error("Lectura no autorizada") })
    const transaction = vi.fn(() => { throw new Error("Mutacion no autorizada") })
    const crearSaldoCero = vi.fn()
    const servicio = crearAdministracionProductos({
      db: { select, transaction } as unknown as NodePgDatabase,
      exigir: crearExigirAdministradora(async () => null), crearSaldoCero,
    })
    expect(await servicio.crear(new Headers(), null)).toEqual({ estado: "sesion_requerida" })
    expect(await servicio.editar(new Headers(), null, null)).toEqual({ estado: "sesion_requerida" })
    await expect(servicio.consultar(new Headers())).rejects.toMatchObject({ codigo: "SESION_REQUERIDA" })
    expect(select).not.toHaveBeenCalled()
    expect(transaction).not.toHaveBeenCalled()
    expect(crearSaldoCero).not.toHaveBeenCalled()
  })
})
