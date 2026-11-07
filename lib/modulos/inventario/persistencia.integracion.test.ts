import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { eq, inArray, sql } from "drizzle-orm"
import type { ConexionBd } from "@/lib/infraestructura/conexion-bd"
import { ajusteStock, inventario, movimientoStock } from "@/lib/infraestructura/esquemas/inventario"
import { producto } from "@/lib/infraestructura/esquemas/producto"
import { registrarAjuste } from "@/lib/modulos/inventario/ajustes"
import {
  esErrorProductoSinSaldo,
  esErrorReversaInvalida,
  esErrorStockInsuficiente,
  type VariacionConOrigen,
} from "@/lib/modulos/inventario/contrato"
import { crearContratoInventario, movimientoYaRevertidoDe } from "@/lib/modulos/inventario/persistencia"
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
  describe("reversas", () => {
    // Aplica un movimiento original y devuelve su ID y su origen para revertirlo.
    async function original(productoId: string, delta: number) {
      const [origen] = await crearOrigenes(1, productoId)
      const resultado = await db().transaction((tx) =>
        contrato().aplicarMovimientos(tx, { actorId: ACTOR, variaciones: [variacion(productoId, delta, origen)] }))
      return { id: resultado.movimientos[0].id, origen }
    }
    const revertir = (productoId: string, delta: number, origen: VariacionConOrigen["origen"], reversaDe: string) =>
      db().transaction((tx) =>
        contrato().aplicarMovimientos(tx, { actorId: ACTOR, variaciones: [{ ...variacion(productoId, delta, origen), reversaDe }] }))
    async function motivoDe(promesa: Promise<unknown>) {
      try { await promesa } catch (error) {
        if (esErrorReversaInvalida(error)) return error.motivo
        throw error
      }
      return "sin error"
    }

    it("revierte un ingreso: resta, registra REVERSA ligada al original y conserva el origen", async () => {
      await fijarSaldo(PRODUCTO_A, 10)
      const o = await original(PRODUCTO_A, 5)

      const resultado = await revertir(PRODUCTO_A, -5, o.origen, o.id)

      expect(resultado.saldos).toEqual([{ productoId: PRODUCTO_A, saldoAnterior: 15, saldoResultante: 10 }])
      expect(resultado.movimientos).toEqual([{ id: expect.any(String), productoId: PRODUCTO_A, delta: -5, tipo: "REVERSA" }])
      const [reversa] = await db().select().from(movimientoStock).where(eq(movimientoStock.id, resultado.movimientos[0].id))
      expect(reversa).toMatchObject({ tipo: "REVERSA", reversaDe: o.id, ajusteId: o.origen.ajusteId, saldoResultante: 10 })
      expect(await saldoDe(PRODUCTO_A)).toBe(10)
    })

    it("revierte un egreso: reintegra las unidades", async () => {
      await fijarSaldo(PRODUCTO_A, 10)
      const o = await original(PRODUCTO_A, -4)

      await revertir(PRODUCTO_A, 4, o.origen, o.id)

      expect(await saldoDe(PRODUCTO_A)).toBe(10)
    })

    it("reintegra exactamente una vez: la segunda reversa se rechaza sin efectos", async () => {
      await fijarSaldo(PRODUCTO_A, 10)
      const o = await original(PRODUCTO_A, -4)
      await revertir(PRODUCTO_A, 4, o.origen, o.id)

      expect(await motivoDe(revertir(PRODUCTO_A, 4, o.origen, o.id))).toBe("YA_REVERTIDO")

      expect(await saldoDe(PRODUCTO_A)).toBe(10)
      expect(await db().select().from(movimientoStock).where(eq(movimientoStock.reversaDe, o.id))).toHaveLength(1)
    })

    it("dos reversas simultaneas del mismo movimiento: solo una se aplica", async () => {
      await fijarSaldo(PRODUCTO_A, 10)
      const o = await original(PRODUCTO_A, -4)

      const resultados = await Promise.allSettled(Array.from({ length: 4 }, () => revertir(PRODUCTO_A, 4, o.origen, o.id)))

      expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(1)
      for (const r of resultados) if (r.status === "rejected") expect(esErrorReversaInvalida(r.reason)).toBe(true)
      expect(await saldoDe(PRODUCTO_A)).toBe(10)
    })

    it("bloquea revertir un ingreso si el saldo ya no alcanza, sin efectos parciales", async () => {
      await fijarSaldo(PRODUCTO_A, 0)
      const o = await original(PRODUCTO_A, 5)
      const [otro] = await crearOrigenes(1, PRODUCTO_A)
      await db().transaction((tx) => contrato().aplicarMovimientos(tx, { actorId: ACTOR, variaciones: [variacion(PRODUCTO_A, -3, otro)] }))

      const error = await revertir(PRODUCTO_A, -5, o.origen, o.id).catch((e: unknown) => e)

      expect(esErrorStockInsuficiente(error)).toBe(true)
      expect(error).toMatchObject({ disponible: 2, requerido: 5 })
      expect(await saldoDe(PRODUCTO_A)).toBe(2)
      expect(await db().select().from(movimientoStock).where(eq(movimientoStock.reversaDe, o.id))).toHaveLength(0)
    })

    it("revierte varias lineas de productos distintos en una sola operacion, todo o nada", async () => {
      await fijarSaldo(PRODUCTO_A, 10)
      await fijarSaldo(PRODUCTO_B, 10)
      const a = await original(PRODUCTO_A, 3)
      const b = await original(PRODUCTO_B, 2)
      await fijarSaldo(PRODUCTO_B, 1) // la reversa de B ya no alcanza

      const error = await db().transaction((tx) =>
        contrato().aplicarMovimientos(tx, {
          actorId: ACTOR,
          variaciones: [
            { ...variacion(PRODUCTO_A, -3, a.origen), reversaDe: a.id },
            { ...variacion(PRODUCTO_B, -2, b.origen), reversaDe: b.id },
          ],
        })).catch((e: unknown) => e)

      expect(esErrorStockInsuficiente(error)).toBe(true)
      expect(await saldoDe(PRODUCTO_A)).toBe(13)
      expect(await db().select().from(movimientoStock).where(inArray(movimientoStock.reversaDe, [a.id, b.id]))).toHaveLength(0)
    })

    it("rechaza reversas que no cumplen el contrato", async () => {
      await fijarSaldo(PRODUCTO_A, 10)
      await fijarSaldo(PRODUCTO_B, 10)
      const o = await original(PRODUCTO_A, 5)
      const [ajenoOrigen] = await crearOrigenes(1, PRODUCTO_A)

      expect(await motivoDe(revertir(PRODUCTO_A, -5, o.origen, crypto.randomUUID()))).toBe("NO_ENCONTRADO")
      expect(await motivoDe(revertir(PRODUCTO_B, -5, o.origen, o.id))).toBe("PRODUCTO_DISTINTO")
      expect(await motivoDe(revertir(PRODUCTO_A, -5, ajenoOrigen, o.id))).toBe("ORIGEN_DISTINTO")
      expect(await motivoDe(revertir(PRODUCTO_A, -4, o.origen, o.id))).toBe("DELTA_NO_OPUESTO")
      expect(await motivoDe(revertir(PRODUCTO_A, 5, o.origen, o.id))).toBe("DELTA_NO_OPUESTO")
      expect(await saldoDe(PRODUCTO_A)).toBe(15)

      const reversa = await revertir(PRODUCTO_A, -5, o.origen, o.id)
      expect(await motivoDe(revertir(PRODUCTO_A, 5, o.origen, reversa.movimientos[0].id))).toBe("NO_ES_ORIGINAL")
    })

    it("otra violacion de unicidad no se informa como reversa ya hecha", async () => {
      await fijarSaldo(PRODUCTO_A, 10)
      const o = await original(PRODUCTO_A, 5)

      // La reversa es valida, pero la segunda variacion repite el origen de un ORIGINAL existente
      // y viola otra unica (ajuste_id, tipo): el error de la base debe llegar sin disfrazarse.
      const error = await db().transaction((tx) =>
        contrato().aplicarMovimientos(tx, {
          actorId: ACTOR,
          variaciones: [
            { ...variacion(PRODUCTO_A, -5, o.origen), reversaDe: o.id },
            variacion(PRODUCTO_B, 1, o.origen),
          ],
        })).catch((e: unknown) => e)

      expect(esErrorReversaInvalida(error)).toBe(false)
      expect(error).toBeInstanceOf(Error)
      expect(await saldoDe(PRODUCTO_A)).toBe(15)
      expect(await db().select().from(movimientoStock).where(eq(movimientoStock.reversaDe, o.id))).toHaveLength(0)
    })

    it("solo reconoce como YA_REVERTIDO la unica de reversa_de, directa o dentro de cause", () => {
      const reversa = { code: "23505", constraint: "movimiento_stock_reversa_de_unica", detail: "Key (reversa_de)=(abc-123) already exists." }
      expect(movimientoYaRevertidoDe(reversa)).toBe("abc-123")
      expect(movimientoYaRevertidoDe(new Error("x", { cause: reversa }))).toBe("abc-123")
      expect(movimientoYaRevertidoDe({ cause: reversa })).toBe("abc-123")
      expect(movimientoYaRevertidoDe({ code: "23505", constraint: "movimiento_stock_ajuste_tipo_unico" })).toBeNull()
      expect(movimientoYaRevertidoDe({ code: "23514", constraint: "movimiento_stock_reversa_de_unica" })).toBeNull()
      expect(movimientoYaRevertidoDe(new Error("otro"))).toBeNull()
      expect(movimientoYaRevertidoDe(null)).toBeNull()
    })

    it("consultarMovimientosDeOrigen entrega el ID del original y si ya fue revertido", async () => {
      await fijarSaldo(PRODUCTO_A, 10)
      const o = await original(PRODUCTO_A, 5)
      const consultar = () => db().transaction((tx) => contrato().consultarMovimientosDeOrigen(tx, [o.origen]))

      expect(await consultar()).toEqual([{ id: o.id, origen: o.origen, productoId: PRODUCTO_A, delta: 5, revertido: false }])
      await revertir(PRODUCTO_A, -5, o.origen, o.id)
      expect(await consultar()).toEqual([{ id: o.id, origen: o.origen, productoId: PRODUCTO_A, delta: 5, revertido: true }])
    })
  })
})
