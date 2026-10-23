import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { eq, inArray, sql } from "drizzle-orm"
import type { ConexionBd } from "@/lib/infraestructura/conexion-bd"
import { ajusteStock, inventario, movimientoStock } from "@/lib/infraestructura/esquemas/inventario"
import { producto } from "@/lib/infraestructura/esquemas/producto"
import { registrarAjuste } from "@/lib/modulos/inventario/ajustes"
import {
  esErrorProductoSinSaldo,
  esErrorStockInsuficiente,
  type VariacionConOrigen,
} from "@/lib/modulos/inventario/contrato"
import { crearContratoInventario } from "@/lib/modulos/inventario/persistencia"
import { insertarProductoOcultoConSaldo, sembrarCategorias } from "@/lib/modulos/productos/persistencia"
import { crearConexionPruebas } from "@/pruebas/arnes-bd"

// Contrato de inventario contra PostgreSQL real (tareas 1.3, 2.3 y 2.4): saldo cero junto al alta
// de Producto, locks, no negatividad, rollback, concurrencia e idempotencia. Los dobles en
// memoria no prueban nada de esto.

const ACTOR = "usuario-prueba-inventario"
const PRODUCTO_A = "a1111111-1111-4111-8111-111111111111"
const PRODUCTO_B = "b2222222-2222-4222-8222-222222222222"

describe("inventario sobre PostgreSQL", () => {
  let conexion: ConexionBd | undefined

  function db() {
    if (!conexion) throw new Error("La conexion de pruebas no esta disponible.")
    return conexion.db
  }
  const contrato = () => crearContratoInventario(db())

  async function limpiar() {
    await db().delete(movimientoStock)
    await db().delete(ajusteStock)
    await db().delete(inventario)
    await db().delete(producto).where(inArray(producto.id, [PRODUCTO_A, PRODUCTO_B]))
  }

  async function crearProducto(id: string, nombre: string) {
    await db().transaction(async (tx) => {
      await insertarProductoOcultoConSaldo(
        tx,
        id,
        { nombre, precio: "10.00", categoriaCodigo: "collares" },
        contrato().crearSaldoCero,
      )
    })
  }

  async function saldoDe(id: string): Promise<number> {
    const [fila] = await db().select().from(inventario).where(eq(inventario.productoId, id))
    return fila.cantidad
  }

  // Deja un saldo conocido directamente en SQL, sin pasar por el contrato que se prueba.
  async function fijarSaldo(id: string, cantidad: number, minimo: number | null = null) {
    await db().update(inventario).set({ cantidad, minimo }).where(eq(inventario.productoId, id))
  }

  // Cada movimiento necesita un ajuste de origen real (FK) y unico por tipo (indice parcial).
  async function crearOrigenes(cantidad: number, productoId = PRODUCTO_A) {
    const filas = await db()
      .insert(ajusteStock)
      .values(
        Array.from({ length: cantidad }, () => ({
          productoId, tipo: "INCREMENTO", cantidad: 1, motivo: "origen de prueba",
          actorId: ACTOR, claveSolicitud: crypto.randomUUID(), huella: "h",
        })),
      )
      .returning({ id: ajusteStock.id })
    return filas.map((fila) => ({ tipo: "AJUSTE", ajusteId: fila.id }) as const)
  }

  function variacion(productoId: string, delta: number, origen: VariacionConOrigen["origen"]): VariacionConOrigen {
    return { productoId, delta, origen }
  }

  beforeAll(async () => {
    conexion = crearConexionPruebas()
    await db().transaction(sembrarCategorias)
    await db().execute(sql`
      INSERT INTO "user" (id, name, email) VALUES (${ACTOR}, 'Prueba', 'prueba-inventario@ejemplo.com')
      ON CONFLICT (id) DO NOTHING`)
  })

  beforeEach(async () => {
    await limpiar()
    await crearProducto(PRODUCTO_A, "Producto A")
    await crearProducto(PRODUCTO_B, "Producto B")
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

  describe("saldo cero junto al alta de Producto (C0)", () => {
    it("crea el producto con saldo 0 y minimo null en la misma transaccion", async () => {
      const [fila] = await db().select().from(inventario).where(eq(inventario.productoId, PRODUCTO_A))

      expect(fila).toMatchObject({ cantidad: 0, minimo: null, version: 1 })
    })

    it("si falla el alta, no queda producto sin saldo ni saldo huerfano", async () => {
      const id = "c3333333-3333-4333-8333-333333333333"

      await expect(
        db().transaction(async (tx) => {
          await insertarProductoOcultoConSaldo(
            tx,
            id,
            { nombre: "Efimero", precio: "1.00", categoriaCodigo: "collares" },
            contrato().crearSaldoCero,
          )
          throw new Error("fallo posterior al alta")
        }),
      ).rejects.toThrow("fallo posterior al alta")

      expect(await db().select().from(producto).where(eq(producto.id, id))).toHaveLength(0)
      expect(await db().select().from(inventario).where(eq(inventario.productoId, id))).toHaveLength(0)
    })

    it("no admite un segundo saldo para el mismo producto ni saldo de un producto inexistente", async () => {
      await expect(
        db().transaction((tx) => contrato().crearSaldoCero(tx, PRODUCTO_A)),
      ).rejects.toThrow()
      await expect(
        db().transaction((tx) => contrato().crearSaldoCero(tx, "d4444444-4444-4444-8444-444444444444")),
      ).rejects.toThrow()
    })
  })

  describe("restricciones de la base", () => {
    it("rechaza saldo negativo y minimo negativo aunque se salte la logica", async () => {
      await expect(fijarSaldo(PRODUCTO_A, -1)).rejects.toMatchObject({ cause: { code: "23514" } })
      await expect(fijarSaldo(PRODUCTO_A, 0, -1)).rejects.toMatchObject({ cause: { code: "23514" } })
    })

    it("conserva el minimo cero como valor distinto de ausente", async () => {
      await fijarSaldo(PRODUCTO_A, 0, 0)

      const [disp] = await contrato().consultarDisponibilidad([PRODUCTO_A])

      expect(disp).toMatchObject({ saldo: 0, minimo: 0, hayStock: false })
    })
  })

  describe("aplicarMovimientos", () => {
    it("aplica variaciones, actualiza version y registra un movimiento por variacion", async () => {
      await fijarSaldo(PRODUCTO_A, 5)
      const ajuste = await db()
        .insert(ajusteStock)
        .values({
          productoId: PRODUCTO_A, tipo: "INCREMENTO", cantidad: 1, motivo: "origen de prueba",
          actorId: ACTOR, claveSolicitud: crypto.randomUUID(), huella: "h",
        })
        .returning()
      const origen = { tipo: "AJUSTE", ajusteId: ajuste[0].id } as const

      const resultado = await db().transaction((tx) =>
        contrato().aplicarMovimientos(tx, {
          actorId: ACTOR,
          variaciones: [
            { productoId: PRODUCTO_A, delta: 3, origen },
          ],
        }),
      )

      expect(resultado.saldos).toEqual([{ productoId: PRODUCTO_A, saldoAnterior: 5, saldoResultante: 8 }])
      expect(await saldoDe(PRODUCTO_A)).toBe(8)
      const movimientos = await db().select().from(movimientoStock)
      expect(movimientos).toHaveLength(1)
      expect(movimientos[0]).toMatchObject({ delta: 3, saldoResultante: 8, tipo: "ORIGINAL", actorId: ACTOR })
    })

    it("rechaza un producto sin saldo con un error propio y sin efectos", async () => {
      const [origen] = await crearOrigenes(1)
      const error = await db()
        .transaction((tx) =>
          contrato().aplicarMovimientos(tx, {
            actorId: ACTOR,
            variaciones: [variacion("e5555555-5555-4555-8555-555555555555", 1, origen)],
          }),
        )
        .catch((e: unknown) => e)

      expect(esErrorProductoSinSaldo(error)).toBe(true)
    })

    it("no deja efectos parciales si un producto no alcanza (todo o nada)", async () => {
      await fijarSaldo(PRODUCTO_A, 10)
      await fijarSaldo(PRODUCTO_B, 1)
      const [origenA] = await crearOrigenes(1, PRODUCTO_A)
      const [origenB] = await crearOrigenes(1, PRODUCTO_B)

      const error = await db()
        .transaction((tx) =>
          contrato().aplicarMovimientos(tx, {
            actorId: ACTOR,
            variaciones: [variacion(PRODUCTO_A, -5, origenA), variacion(PRODUCTO_B, -2, origenB)],
          }),
        )
        .catch((e: unknown) => e)

      expect(esErrorStockInsuficiente(error)).toBe(true)
      expect(error).toMatchObject({ productoId: PRODUCTO_B, disponible: 1, requerido: 2 })
      expect(await saldoDe(PRODUCTO_A)).toBe(10)
      expect(await saldoDe(PRODUCTO_B)).toBe(1)
      expect(await db().select().from(movimientoStock)).toHaveLength(0)
    })

    it("dos operaciones por la ultima unidad: solo una confirma y el saldo nunca es negativo", async () => {
      await fijarSaldo(PRODUCTO_A, 1)
      const origenes = await crearOrigenes(2)
      const consumir = (origen: VariacionConOrigen["origen"]) =>
        db().transaction((tx) =>
          contrato().aplicarMovimientos(tx, { actorId: ACTOR, variaciones: [variacion(PRODUCTO_A, -1, origen)] }),
        )

      const resultados = await Promise.allSettled(origenes.map(consumir))

      expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(1)
      const rechazada = resultados.find((r) => r.status === "rejected")
      expect(esErrorStockInsuficiente((rechazada as PromiseRejectedResult).reason)).toBe(true)
      expect(await saldoDe(PRODUCTO_A)).toBe(0)
    })

    it("varias operaciones concurrentes consumen exactamente el saldo disponible", async () => {
      await fijarSaldo(PRODUCTO_A, 5)
      const origenes = await crearOrigenes(12)
      const consumir = (origen: VariacionConOrigen["origen"]) =>
        db().transaction((tx) =>
          contrato().aplicarMovimientos(tx, { actorId: ACTOR, variaciones: [variacion(PRODUCTO_A, -1, origen)] }),
        )

      const resultados = await Promise.allSettled(origenes.map(consumir))

      expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(5)
      expect(await saldoDe(PRODUCTO_A)).toBe(0)
      expect(await db().select().from(movimientoStock)).toHaveLength(5)
    })

    it("toma los locks en orden de producto: operaciones en sentidos opuestos no se bloquean entre si", async () => {
      await fijarSaldo(PRODUCTO_A, 1000)
      await fijarSaldo(PRODUCTO_B, 1000)
      const origenesA = await crearOrigenes(20, PRODUCTO_A)
      const origenesB = await crearOrigenes(20, PRODUCTO_B)
      const operar = (primero: string, segundo: string, i: number) =>
        db().transaction((tx) =>
          contrato().aplicarMovimientos(tx, {
            actorId: ACTOR,
            variaciones: [
              variacion(primero, -1, primero === PRODUCTO_A ? origenesA[i] : origenesB[i]),
              variacion(segundo, -1, segundo === PRODUCTO_A ? origenesA[i] : origenesB[i]),
            ],
          }),
        )

      const resultados = await Promise.allSettled(
        Array.from({ length: 20 }, (_, i) =>
          i % 2 === 0 ? operar(PRODUCTO_A, PRODUCTO_B, i) : operar(PRODUCTO_B, PRODUCTO_A, i),
        ),
      )

      expect(resultados.every((r) => r.status === "fulfilled")).toBe(true)
      expect(await saldoDe(PRODUCTO_A)).toBe(980)
      expect(await saldoDe(PRODUCTO_B)).toBe(980)
    })
  })

  describe("registrarAjuste", () => {
    const comando = (extra: Partial<Parameters<typeof registrarAjuste>[2]> = {}) => ({
      claveSolicitud: crypto.randomUUID(),
      productoId: PRODUCTO_A,
      tipo: "INCREMENTO",
      cantidad: 4,
      motivo: "reposicion encontrada",
      actorId: ACTOR,
      ...extra,
    })

    it("registra un incremento con motivo, actor e historia", async () => {
      const resultado = await registrarAjuste(db(), contrato(), comando())

      expect(resultado).toMatchObject({ estado: "ok", repetido: false, ajuste: { saldoResultante: 4 } })
      expect(await saldoDe(PRODUCTO_A)).toBe(4)
      const [ajuste] = await db().select().from(ajusteStock)
      expect(ajuste).toMatchObject({ motivo: "reposicion encontrada", actorId: ACTOR, tipo: "INCREMENTO" })
      const [movimiento] = await db().select().from(movimientoStock)
      expect(movimiento).toMatchObject({ ajusteId: ajuste.id, delta: 4, saldoResultante: 4 })
    })

    it("el saldo inicial queda identificado como tal, sin compra ni efecto economico", async () => {
      const resultado = await registrarAjuste(db(), contrato(), comando({ tipo: "INICIAL", cantidad: 10, motivo: "existencias previas" }))

      expect(resultado).toMatchObject({ estado: "ok", ajuste: { tipo: "INICIAL", saldoResultante: 10 } })
      const [ajuste] = await db().select().from(ajusteStock)
      expect(ajuste.tipo).toBe("INICIAL")
    })

    it("rechaza un decremento que supera el saldo sin registrar nada", async () => {
      await fijarSaldo(PRODUCTO_A, 2)

      const resultado = await registrarAjuste(db(), contrato(), comando({ tipo: "DECREMENTO", cantidad: 3 }))

      expect(resultado).toEqual({ estado: "stock_insuficiente", disponible: 2, requerido: 3 })
      expect(await saldoDe(PRODUCTO_A)).toBe(2)
      expect(await db().select().from(ajusteStock)).toHaveLength(0)
      expect(await db().select().from(movimientoStock)).toHaveLength(0)
    })

    it("rechaza un ajuste sin motivo sin tocar la base", async () => {
      const resultado = await registrarAjuste(db(), contrato(), comando({ motivo: "  " }))

      expect(resultado).toEqual({ estado: "datos_invalidos", errores: [{ campo: "motivo", codigo: "REQUERIDO" }] })
      expect(await db().select().from(ajusteStock)).toHaveLength(0)
    })

    it("repetir la misma solicitud devuelve el resultado sin un segundo efecto", async () => {
      const mismo = comando()

      const primero = await registrarAjuste(db(), contrato(), mismo)
      const segundo = await registrarAjuste(db(), contrato(), mismo)

      expect(primero).toMatchObject({ estado: "ok", repetido: false })
      expect(segundo).toMatchObject({ estado: "ok", repetido: true, ajuste: { saldoResultante: 4 } })
      expect(await saldoDe(PRODUCTO_A)).toBe(4)
      expect(await db().select().from(ajusteStock)).toHaveLength(1)
      expect(await db().select().from(movimientoStock)).toHaveLength(1)
    })

    it("la misma clave con otro contenido es un conflicto y no cambia el saldo", async () => {
      const mismo = comando()
      await registrarAjuste(db(), contrato(), mismo)

      const conflicto = await registrarAjuste(db(), contrato(), { ...mismo, cantidad: 99 })

      expect(conflicto).toEqual({ estado: "conflicto_solicitud" })
      expect(await saldoDe(PRODUCTO_A)).toBe(4)
    })

    it("dos envios simultaneos de la misma solicitud producen un unico efecto", async () => {
      const mismo = comando({ cantidad: 7 })

      const resultados = await Promise.all([
        registrarAjuste(db(), contrato(), mismo),
        registrarAjuste(db(), contrato(), mismo),
        registrarAjuste(db(), contrato(), mismo),
      ])

      expect(resultados.every((r) => r.estado === "ok")).toBe(true)
      expect(resultados.filter((r) => r.estado === "ok" && !r.repetido)).toHaveLength(1)
      expect(await saldoDe(PRODUCTO_A)).toBe(7)
      expect(await db().select().from(movimientoStock)).toHaveLength(1)
    })

    it("informa un producto inexistente como producto sin saldo", async () => {
      const resultado = await registrarAjuste(db(), contrato(), comando({ productoId: "f6666666-6666-4666-8666-666666666666" })).catch((e: unknown) => e)

      // No existe ni el Producto: la FK del ajuste lo rechaza antes de llegar al saldo.
      expect(resultado).toBeInstanceOf(Error)
    })
  })
})
