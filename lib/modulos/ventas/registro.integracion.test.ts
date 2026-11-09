import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { eq, inArray, sql } from "drizzle-orm"
import type { ConexionBd } from "@/lib/infraestructura/conexion-bd"
import { ajusteStock, inventario, movimientoStock } from "@/lib/infraestructura/esquemas/inventario"
import { producto } from "@/lib/infraestructura/esquemas/producto"
import { venta, ventaLinea } from "@/lib/infraestructura/esquemas/venta"
import type { ContratoInventario } from "@/lib/modulos/inventario/contrato"
import { crearContratoInventario } from "@/lib/modulos/inventario/persistencia"
import { insertarProductoOcultoConSaldo, sembrarCategorias } from "@/lib/modulos/productos/persistencia"
import type { ComandoRegistrarVenta, ResultadoRegistroVenta } from "@/lib/modulos/ventas/contrato"
import { registrarVenta } from "@/lib/modulos/ventas/registro"
import { crearConexionPruebas } from "@/pruebas/arnes-bd"

// Registro de ventas contra PostgreSQL real (change implement-sales, 3.1, 3.2 y 3.3): efecto unico
// en stock, atomicidad, idempotencia y concurrencia. Los dobles en memoria no prueban nada de esto.

const ACTOR = "usuario-prueba-registro-venta"
const PRODUCTO_A = "a1010101-1010-4101-8101-101010101010"
const PRODUCTO_B = "b2020202-2020-4202-8202-202020202020"

describe("registro de ventas sobre PostgreSQL", () => {
  let conexion: ConexionBd | undefined

  function db() {
    if (!conexion) throw new Error("La conexion de pruebas no esta disponible.")
    return conexion.db
  }
  const contrato = () => crearContratoInventario(db())

  // Lectura de Producto como la hara el borde: nombre y precio vigentes, ocultos incluidos.
  const leerProductos = (ids: readonly string[]) =>
    db()
      .select({ id: producto.id, nombre: producto.nombre, precio: producto.precio })
      .from(producto)
      .where(inArray(producto.id, [...ids]))

  async function limpiar() {
    await db().delete(movimientoStock)
    await db().delete(ajusteStock)
    await db().delete(ventaLinea)
    await db().delete(venta)
    await db().delete(inventario)
    await db().delete(producto).where(inArray(producto.id, [PRODUCTO_A, PRODUCTO_B]))
  }

  async function saldoDe(id: string): Promise<number> {
    const [fila] = await db().select().from(inventario).where(eq(inventario.productoId, id))
    return fila.cantidad
  }

  async function fijarSaldo(id: string, cantidad: number) {
    await db().update(inventario).set({ cantidad }).where(eq(inventario.productoId, id))
  }

  function comando(cambios: Partial<ComandoRegistrarVenta> = {}): ComandoRegistrarVenta {
    return {
      claveSolicitud: crypto.randomUUID(),
      fechaOperacion: "2026-11-05",
      lineas: [{ productoId: PRODUCTO_A, cantidad: 2 }],
      actorId: ACTOR,
      ...cambios,
    }
  }

  const registrar = (cmd: ComandoRegistrarVenta, inventarioContrato: ContratoInventario = contrato()) =>
    registrarVenta(db(), inventarioContrato, leerProductos, cmd)

  async function sinEfectos() {
    expect(await db().select().from(venta)).toHaveLength(0)
    expect(await db().select().from(ventaLinea)).toHaveLength(0)
    expect(await db().select().from(movimientoStock)).toHaveLength(0)
  }

  function ok(resultado: ResultadoRegistroVenta) {
    if (resultado.estado !== "ok") throw new Error(`Se esperaba ok y llego ${resultado.estado}`)
    return resultado
  }

  beforeAll(async () => {
    conexion = crearConexionPruebas()
    await db().transaction(sembrarCategorias)
    await db().execute(sql`
      INSERT INTO "user" (id, name, email) VALUES (${ACTOR}, 'Prueba', 'prueba-registro-venta@ejemplo.com')
      ON CONFLICT (id) DO NOTHING`)
  })

  beforeEach(async () => {
    await limpiar()
    for (const [id, nombre, precio] of [[PRODUCTO_A, "Collar de plata", "10.10"], [PRODUCTO_B, "Pulsera", "0.10"]]) {
      await db().transaction(async (tx) => {
        await insertarProductoOcultoConSaldo(
          tx, id, { nombre, precio, categoriaCodigo: "collares" }, contrato().crearSaldoCero,
        )
      })
    }
    await fijarSaldo(PRODUCTO_A, 5)
    await fijarSaldo(PRODUCTO_B, 5)
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

  describe("registrar (3.1)", () => {
    it("guarda una venta multilinea con precio y nombre historicos y descuenta el stock", async () => {
      const resultado = ok(
        await registrar(
          comando({
            comprador: "  Ana Pérez ",
            lineas: [{ productoId: PRODUCTO_A, cantidad: 2 }, { productoId: PRODUCTO_B, cantidad: 3 }],
          }),
        ),
      )

      expect(resultado.repetido).toBe(false)
      expect(resultado.productosAfectados.slice().sort()).toEqual([PRODUCTO_A, PRODUCTO_B])
      expect(resultado.venta).toMatchObject({
        fechaOperacion: "2026-11-05", comprador: "Ana Pérez", total: "20.50", estado: "CONFIRMADA", anuladoEn: null,
      })
      expect(resultado.venta.lineas).toEqual([
        { numeroLinea: 1, productoId: PRODUCTO_A, nombreProducto: "Collar de plata", cantidad: 2, precioUnitario: "10.10", subtotal: "20.20" },
        { numeroLinea: 2, productoId: PRODUCTO_B, nombreProducto: "Pulsera", cantidad: 3, precioUnitario: "0.10", subtotal: "0.30" },
      ])
      expect(await saldoDe(PRODUCTO_A)).toBe(3)
      expect(await saldoDe(PRODUCTO_B)).toBe(2)
    })

    it("cada linea es el origen de su movimiento de stock", async () => {
      const resultado = ok(
        await registrar(comando({ lineas: [{ productoId: PRODUCTO_A, cantidad: 1 }, { productoId: PRODUCTO_A, cantidad: 2 }] })),
      )

      const lineas = await db().select().from(ventaLinea).where(eq(ventaLinea.ventaId, resultado.venta.id))
      const movimientos = await db().select().from(movimientoStock)
      expect(lineas).toHaveLength(2)
      expect(movimientos).toHaveLength(2)
      expect(movimientos.map((m) => m.ventaLineaId).sort()).toEqual(lineas.map((l) => l.id).sort())
      expect(movimientos.every((m) => m.tipo === "ORIGINAL" && m.ajusteId === null)).toBe(true)
      expect(movimientos.map((m) => m.delta).sort((a, b) => a - b)).toEqual([-2, -1])
      expect(await saldoDe(PRODUCTO_A)).toBe(2)
    })

    it("vende un producto oculto con stock y guarda sin comprador (Consumidor Final)", async () => {
      const [fila] = await db().select().from(producto).where(eq(producto.id, PRODUCTO_A))
      expect(fila.publicado).toBe(false)

      const resultado = ok(await registrar(comando({ comprador: "   " })))

      expect(resultado.venta.comprador).toBeNull()
      const [guardada] = await db().select().from(venta).where(eq(venta.id, resultado.venta.id))
      expect(guardada.comprador).toBeNull()
    })

    it("guarda la fecha real y la de carga automatica por separado", async () => {
      const resultado = ok(await registrar(comando({ fechaOperacion: "2026-01-15" })))

      expect(resultado.venta.fechaOperacion).toBe("2026-01-15")
      expect(new Date(resultado.venta.creadoEn).getFullYear()).toBeGreaterThanOrEqual(2026)
      expect(resultado.venta.creadoEn.startsWith("2026-01-15")).toBe(false)
    })

    it("un cambio posterior del precio o del nombre no altera la venta ya registrada", async () => {
      const resultado = ok(await registrar(comando()))

      await db().update(producto).set({ precio: "99.00", nombre: "Otro nombre" }).where(eq(producto.id, PRODUCTO_A))

      const [cabecera] = await db().select().from(venta).where(eq(venta.id, resultado.venta.id))
      const [linea] = await db().select().from(ventaLinea).where(eq(ventaLinea.ventaId, resultado.venta.id))
      expect(cabecera.total).toBe("20.20")
      expect(linea).toMatchObject({ nombreProductoHistorico: "Collar de plata", precioUnitarioHistorico: "10.10", subtotal: "20.20" })
    })

    it("rechaza datos invalidos y productos inexistentes sin escribir nada", async () => {
      const invalido = await registrar(comando({ fechaOperacion: "ayer", lineas: [] }))
      const inexistente = await registrar(
        comando({ lineas: [{ productoId: "c3030303-3030-4303-8303-303030303030", cantidad: 1 }] }),
      )

      expect(invalido.estado).toBe("datos_invalidos")
      expect(inexistente).toEqual({
        estado: "producto_no_encontrado", productoIds: ["c3030303-3030-4303-8303-303030303030"],
      })
      await sinEfectos()
      expect(await saldoDe(PRODUCTO_A)).toBe(5)
    })
  })

  describe("confirmar con stock (3.2)", () => {
    it("con stock insuficiente no registra nada, informa el disponible y deja el saldo intacto", async () => {
      await fijarSaldo(PRODUCTO_B, 1)

      const resultado = await registrar(
        comando({ lineas: [{ productoId: PRODUCTO_A, cantidad: 2 }, { productoId: PRODUCTO_B, cantidad: 3 }] }),
      )

      expect(resultado).toEqual({ estado: "stock_insuficiente", productoId: PRODUCTO_B, disponible: 1, requerido: 3 })
      await sinEfectos()
      expect(await saldoDe(PRODUCTO_A)).toBe(5)
      expect(await saldoDe(PRODUCTO_B)).toBe(1)
    })

    it("evalua juntas las lineas repetidas del mismo producto", async () => {
      const resultado = await registrar(
        comando({ lineas: [{ productoId: PRODUCTO_A, cantidad: 3 }, { productoId: PRODUCTO_A, cantidad: 3 }] }),
      )

      expect(resultado).toEqual({ estado: "stock_insuficiente", productoId: PRODUCTO_A, disponible: 5, requerido: 6 })
      await sinEfectos()
    })

    it("permite vender exactamente todo el stock", async () => {
      ok(await registrar(comando({ lineas: [{ productoId: PRODUCTO_A, cantidad: 5 }] })))

      expect(await saldoDe(PRODUCTO_A)).toBe(0)
    })

    it("un fallo intermedio en Inventario revierte tambien la cabecera y las lineas", async () => {
      const contratoFallido: ContratoInventario = {
        ...contrato(),
        aplicarMovimientos: async () => {
          throw new Error("falla simulada")
        },
      }

      await expect(registrar(comando(), contratoFallido)).rejects.toThrow("falla simulada")

      await sinEfectos()
      expect(await saldoDe(PRODUCTO_A)).toBe(5)
    })

    it("un producto sin saldo se informa y no deja efectos", async () => {
      await db().delete(inventario).where(eq(inventario.productoId, PRODUCTO_A))

      const resultado = await registrar(comando())

      expect(resultado).toEqual({ estado: "producto_sin_saldo", productoId: PRODUCTO_A })
      await sinEfectos()
    })

    it("repetir la misma solicitud despues de una respuesta perdida no duplica nada", async () => {
      const mismo = comando({ comprador: "Ana" })
      const primera = ok(await registrar(mismo))

      // Entre medio el precio cambia: el reintento recupera lo ya confirmado, no recalcula.
      await db().update(producto).set({ precio: "50.00" }).where(eq(producto.id, PRODUCTO_A))
      const segunda = ok(await registrar(mismo))

      expect(segunda.repetido).toBe(true)
      expect(segunda.venta).toEqual(primera.venta)
      expect(segunda.productosAfectados).toEqual([])
      expect(await db().select().from(venta)).toHaveLength(1)
      expect(await db().select().from(movimientoStock)).toHaveLength(1)
      expect(await saldoDe(PRODUCTO_A)).toBe(3)
    })

    it("la misma clave con otro contenido es un conflicto y no cambia nada", async () => {
      const mismo = comando()
      ok(await registrar(mismo))

      const conflicto = await registrar({ ...mismo, lineas: [{ productoId: PRODUCTO_A, cantidad: 4 }] })

      expect(conflicto).toEqual({ estado: "conflicto_solicitud" })
      expect(await db().select().from(venta)).toHaveLength(1)
      expect(await saldoDe(PRODUCTO_A)).toBe(3)
    })
  })

  describe("concurrencia (3.3)", () => {
    it("tres envios simultaneos de la misma solicitud producen un unico efecto", async () => {
      const mismo = comando({ lineas: [{ productoId: PRODUCTO_A, cantidad: 2 }] })

      const resultados = await Promise.all([registrar(mismo), registrar(mismo), registrar(mismo)])

      expect(resultados.every((r) => r.estado === "ok")).toBe(true)
      expect(resultados.filter((r) => r.estado === "ok" && !r.repetido)).toHaveLength(1)
      expect(await db().select().from(venta)).toHaveLength(1)
      expect(await db().select().from(movimientoStock)).toHaveLength(1)
      expect(await saldoDe(PRODUCTO_A)).toBe(3)
    })

    it("dos ventas distintas de la ultima unidad: confirma una sola y la otra informa stock insuficiente", async () => {
      await fijarSaldo(PRODUCTO_A, 1)
      const pedido = () => comando({ lineas: [{ productoId: PRODUCTO_A, cantidad: 1 }] })

      const resultados = await Promise.all([registrar(pedido()), registrar(pedido())])

      expect(resultados.filter((r) => r.estado === "ok")).toHaveLength(1)
      expect(resultados.filter((r) => r.estado === "stock_insuficiente")).toHaveLength(1)
      expect(await saldoDe(PRODUCTO_A)).toBe(0)
      expect(await db().select().from(venta)).toHaveLength(1)
      expect(await db().select().from(movimientoStock)).toHaveLength(1)
    })

    it("ventas simultaneas con productos cruzados no se bloquean entre si y el stock queda exacto", async () => {
      const ab = () => comando({ lineas: [{ productoId: PRODUCTO_A, cantidad: 1 }, { productoId: PRODUCTO_B, cantidad: 1 }] })
      const ba = () => comando({ lineas: [{ productoId: PRODUCTO_B, cantidad: 1 }, { productoId: PRODUCTO_A, cantidad: 1 }] })

      const resultados = await Promise.all([ab(), ba(), ab(), ba()].map((c) => registrar(c)))

      expect(resultados.every((r) => r.estado === "ok")).toBe(true)
      expect(await saldoDe(PRODUCTO_A)).toBe(1)
      expect(await saldoDe(PRODUCTO_B)).toBe(1)
    })
  })
})
