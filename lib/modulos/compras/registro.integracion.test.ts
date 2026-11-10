import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { eq, sql } from "drizzle-orm"
import type { ConexionBd } from "@/lib/infraestructura/conexion-bd"
import { compra, compraLinea } from "@/lib/infraestructura/esquemas/compra"
import { inventario, movimientoStock } from "@/lib/infraestructura/esquemas/inventario"
import { producto } from "@/lib/infraestructura/esquemas/producto"
import { proveedor } from "@/lib/infraestructura/esquemas/proveedor"
import { registrarCompra } from "@/lib/modulos/compras/registro"
import { ACTOR_COMPRAS, crearArnesCompras } from "@/pruebas/arnes-compras"
import { crearConexionPruebas } from "@/pruebas/arnes-bd"

// Registro de compras contra PostgreSQL real (tareas 4.1 y 4.2): cabecera, lineas, stock y
// movimientos en una sola transaccion, con idempotencia y sin efectos parciales.

const PRODUCTO_A = "c1111111-1111-4111-8111-111111111111"
const PRODUCTO_B = "c2222222-2222-4222-8222-222222222222"

describe("registro de compras sobre PostgreSQL", () => {
  let conexion: ConexionBd | undefined
  const arnes = crearArnesCompras(() => {
    if (!conexion) throw new Error("La conexion de pruebas no esta disponible.")
    return conexion
  }, [PRODUCTO_A, PRODUCTO_B])

  const comando = (extra: Record<string, unknown> = {}) => ({
    claveSolicitud: crypto.randomUUID(),
    fechaOperacion: "2026-11-03",
    lineas: [{ productoId: PRODUCTO_A, cantidad: 5, costoUnitario: "100.50" }],
    actorId: ACTOR_COMPRAS,
    ...extra,
  })
  const registrar = (c: ReturnType<typeof comando>) =>
    registrarCompra(arnes.db(), arnes.contrato(), arnes.leerProductos, c)
  const contar = async (tabla: typeof compra | typeof compraLinea) =>
    Number((await arnes.db().select({ n: sql<number>`count(*)` }).from(tabla))[0].n)

  beforeAll(async () => {
    conexion = crearConexionPruebas()
    await arnes.preparar()
  })
  beforeEach(async () => {
    await arnes.limpiar()
    await arnes.crearProducto(PRODUCTO_A, "Producto A")
    await arnes.crearProducto(PRODUCTO_B, "Producto B")
  })
  afterEach(arnes.limpiar)
  afterAll(async () => {
    if (!conexion) return
    try {
      await arnes.limpiar()
      await arnes.quitarUsuario()
    } finally {
      await conexion.pool.end()
    }
  })

  it("registra una compra sin proveedor con varias lineas, total exacto, stock y un movimiento por linea", async () => {
    await arnes.fijarSaldo(PRODUCTO_A, 2)
    const r = await registrar(comando({
      lineas: [
        { productoId: PRODUCTO_A, cantidad: 3, costoUnitario: "10.10" },
        { productoId: PRODUCTO_B, cantidad: 2, costoUnitario: "0.35" },
      ],
    }))

    expect(r.estado).toBe("ok")
    if (r.estado !== "ok") return
    expect(r.repetido).toBe(false)
    expect(r.compra).toMatchObject({ estado: "CONFIRMADA", proveedorId: null, nombreProveedor: null, nota: null, total: "31.00", fechaOperacion: "2026-11-03" })
    expect(r.compra.lineas.map((l) => [l.numeroLinea, l.nombreProducto, l.cantidad, l.costoUnitario, l.subtotal])).toEqual([
      [1, "Producto A", 3, "10.10", "30.30"],
      [2, "Producto B", 2, "0.35", "0.70"],
    ])
    expect(await arnes.saldoDe(PRODUCTO_A)).toBe(5)
    expect(await arnes.saldoDe(PRODUCTO_B)).toBe(2)
    expect([...r.productosAfectados].sort()).toEqual([PRODUCTO_A, PRODUCTO_B])
    const movimientos = await arnes.db().select().from(movimientoStock).where(sql`${movimientoStock.compraLineaId} IS NOT NULL`)
    expect(movimientos.map((m) => [m.delta, m.tipo, m.actorId]).sort()).toEqual([[2, "ORIGINAL", ACTOR_COMPRAS], [3, "ORIGINAL", ACTOR_COMPRAS]])
  })

  it("no fusiona lineas del mismo producto con costos distintos: conserva cada costo historico", async () => {
    const r = await registrar(comando({
      lineas: [
        { productoId: PRODUCTO_A, cantidad: 2, costoUnitario: "10" },
        { productoId: PRODUCTO_A, cantidad: 3, costoUnitario: "12.5" },
      ],
    }))

    expect(r.estado).toBe("ok")
    if (r.estado !== "ok") return
    expect(r.compra.lineas.map((l) => [l.cantidad, l.costoUnitario])).toEqual([[2, "10.00"], [3, "12.50"]])
    expect(r.compra.total).toBe("57.50")
    expect(await arnes.saldoDe(PRODUCTO_A)).toBe(5)
  })

  it("conserva proveedor y nota, y el nombre historico no cambia si el proveedor se renombra", async () => {
    const prov = await arnes.crearProveedor("Mayorista")
    const r = await registrar(comando({ proveedorId: prov.id, nota: "  Pedido de noviembre " }))

    expect(r.estado).toBe("ok")
    if (r.estado !== "ok") return
    expect(r.compra).toMatchObject({ proveedorId: prov.id, nombreProveedor: prov.nombre, nota: "Pedido de noviembre" })

    await arnes.db().update(proveedor).set({ nombre: "Nombre nuevo", activo: false }).where(eq(proveedor.id, prov.id))
    const [guardada] = await arnes.db().select().from(compra).where(eq(compra.id, r.compra.id))
    expect(guardada.nombreProveedorHistorico).toBe(prov.nombre)
    await arnes.db().update(proveedor).set({ nombre: prov.nombre }).where(eq(proveedor.id, prov.id))
  })

  it("rechaza proveedor inexistente o inactivo sin dejar nada", async () => {
    const inactivo = await arnes.crearProveedor("Inactivo", false)

    expect(await registrar(comando({ proveedorId: crypto.randomUUID() }))).toEqual({ estado: "proveedor_no_encontrado" })
    expect(await registrar(comando({ proveedorId: inactivo.id }))).toEqual({ estado: "proveedor_inactivo" })

    expect(await contar(compra)).toBe(0)
    expect(await arnes.saldoDe(PRODUCTO_A)).toBe(0)
  })

  it("rechaza un costo con mas de dos decimales sin redondear ni registrar nada", async () => {
    const r = await registrar(comando({ lineas: [{ productoId: PRODUCTO_A, cantidad: 1, costoUnitario: "10.505" }] }))

    expect(r).toMatchObject({ estado: "datos_invalidos", errores: [{ campo: "costoUnitario", linea: 0, codigo: "IMPORTE_INVALIDO" }] })
    expect(await contar(compra)).toBe(0)
    expect(await arnes.saldoDe(PRODUCTO_A)).toBe(0)
  })

  it.each([
    ["sin lineas", { lineas: [] }],
    ["fecha inexistente", { fechaOperacion: "2026-02-30" }],
    ["cantidad cero", { lineas: [{ productoId: PRODUCTO_A, cantidad: 0, costoUnitario: "1" }] }],
    ["cantidad decimal", { lineas: [{ productoId: PRODUCTO_A, cantidad: 1.5, costoUnitario: "1" }] }],
    ["costo negativo", { lineas: [{ productoId: PRODUCTO_A, cantidad: 1, costoUnitario: "-1" }] }],
    ["producto que no es uuid", { lineas: [{ productoId: "x", cantidad: 1, costoUnitario: "1" }] }],
  ])("rechaza %s sin efectos", async (_nombre, extra) => {
    const r = await registrar(comando(extra))

    expect(r.estado).toBe("datos_invalidos")
    expect(await contar(compra)).toBe(0)
    expect(await arnes.saldoDe(PRODUCTO_A)).toBe(0)
  })

  it("rechaza un producto que no existe", async () => {
    const fantasma = crypto.randomUUID()
    const r = await registrar(comando({ lineas: [{ productoId: fantasma, cantidad: 1, costoUnitario: "1" }] }))

    expect(r).toEqual({ estado: "producto_no_encontrado", productoIds: [fantasma] })
    expect(await contar(compra)).toBe(0)
  })

  it("un fallo intermedio revierte todo: producto sin saldo no deja cabecera, lineas ni stock parcial", async () => {
    // B existe como producto pero su saldo se elimino: aplicarMovimientos falla despues de insertar.
    await arnes.db().delete(inventario).where(eq(inventario.productoId, PRODUCTO_B))

    const r = await registrar(comando({
      lineas: [
        { productoId: PRODUCTO_A, cantidad: 4, costoUnitario: "5" },
        { productoId: PRODUCTO_B, cantidad: 1, costoUnitario: "5" },
      ],
    }))

    expect(r).toEqual({ estado: "producto_sin_saldo", productoId: PRODUCTO_B })
    expect(await contar(compra)).toBe(0)
    expect(await contar(compraLinea)).toBe(0)
    expect(await arnes.saldoDe(PRODUCTO_A)).toBe(0)
    expect(await arnes.db().select().from(movimientoStock).where(eq(movimientoStock.productoId, PRODUCTO_A))).toHaveLength(0)
  })

  it("repetir la misma solicitud no duplica compra, stock ni movimientos", async () => {
    const c = comando()
    const primera = await registrar(c)
    const segunda = await registrar(c)

    expect(primera.estado).toBe("ok")
    expect(segunda).toMatchObject({ estado: "ok", repetido: true, productosAfectados: [] })
    if (primera.estado === "ok" && segunda.estado === "ok") expect(segunda.compra.id).toBe(primera.compra.id)
    expect(await contar(compra)).toBe(1)
    expect(await arnes.saldoDe(PRODUCTO_A)).toBe(5)
    expect(await arnes.db().select().from(movimientoStock).where(eq(movimientoStock.productoId, PRODUCTO_A))).toHaveLength(1)
  })

  it("el mismo costo escrito distinto ('10' y '10.00') es la misma solicitud", async () => {
    const clave = crypto.randomUUID()
    const base = { claveSolicitud: clave, lineas: [{ productoId: PRODUCTO_A, cantidad: 1, costoUnitario: "10" }] }
    await registrar(comando(base))

    const r = await registrar(comando({ ...base, lineas: [{ productoId: PRODUCTO_A, cantidad: 1, costoUnitario: "10.00" }] }))

    expect(r).toMatchObject({ estado: "ok", repetido: true })
  })

  it("la misma clave con otro contenido es un conflicto y no cambia nada", async () => {
    const clave = crypto.randomUUID()
    await registrar(comando({ claveSolicitud: clave }))

    const r = await registrar(comando({ claveSolicitud: clave, lineas: [{ productoId: PRODUCTO_A, cantidad: 9, costoUnitario: "1" }] }))

    expect(r).toEqual({ estado: "conflicto_solicitud" })
    expect(await arnes.saldoDe(PRODUCTO_A)).toBe(5)
    expect(await contar(compra)).toBe(1)
  })

  it("tres envios simultaneos de la misma solicitud producen un unico efecto", async () => {
    const c = comando()
    const resultados = await Promise.all([registrar(c), registrar(c), registrar(c)])

    expect(resultados.every((r) => r.estado === "ok")).toBe(true)
    expect(resultados.filter((r) => r.estado === "ok" && !r.repetido)).toHaveLength(1)
    expect(await contar(compra)).toBe(1)
    expect(await arnes.saldoDe(PRODUCTO_A)).toBe(5)
    expect(await arnes.db().select().from(movimientoStock).where(eq(movimientoStock.productoId, PRODUCTO_A))).toHaveLength(1)
  })

  it("la compra no se vuelve a leer del Producto: un cambio posterior del nombre no la reescribe", async () => {
    const r = await registrar(comando())
    if (r.estado !== "ok") throw new Error("se esperaba ok")
    await arnes.db().update(producto).set({ nombre: "Renombrado" }).where(eq(producto.id, PRODUCTO_A))

    const [linea] = await arnes.db().select().from(compraLinea).where(eq(compraLinea.compraId, r.compra.id))
    expect(linea.nombreProductoHistorico).toBe("Producto A")
  })

  it("el CHECK de la base impide una compra con proveedor sin nombre historico o un subtotal inexacto", async () => {
    const prov = await arnes.crearProveedor("Check")
    const base = { fechaOperacion: "2026-11-03", total: "1.00", actorId: ACTOR_COMPRAS, claveSolicitud: crypto.randomUUID(), huella: "h" }

    await expect(arnes.db().insert(compra).values({ ...base, proveedorId: prov.id })).rejects.toThrow()
    const [c] = await arnes.db().insert(compra).values(base).returning()
    await expect(arnes.db().insert(compraLinea).values({
      compraId: c.id, numeroLinea: 1, productoId: PRODUCTO_A, nombreProductoHistorico: "A", cantidad: 2, costoUnitarioHistorico: "1.00", subtotal: "3.00",
    })).rejects.toThrow()
  })
})
