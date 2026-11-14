import { expect, it } from "vitest"
import { crearPlanDemo, resumirPlan, PRODUCTO_EXPOSICION, CORTE_DEMO } from "./plan"
import { decimalACentavos } from "../../lib/modulos/compras/dinero"
import { CODIGOS_CATEGORIA } from "../../lib/modulos/productos/categorias"
import { evaluarEntradaCompra } from "../../lib/modulos/compras/reglas-compra"
import { evaluarEntradaVenta } from "../../lib/modulos/ventas/reglas-venta"
import { entradaEgreso } from "../../lib/modulos/egresos/validacion"

it("produce el mismo conjunto, con identidades y claves sin colisiones, sin BD ni reloj", () => {
  const p = crearPlanDemo()
  expect(p).toEqual(crearPlanDemo())
  expect([p.productos.length, p.proveedores.length, p.compras.length, p.ventas.length, p.gastos.length]).toEqual([25, 4, 25, 200, 25])
  const ids = [...p.productos.map(v => v.id), ...p.proveedores.map(v => v.id), ...p.compras.map(v => v.clave), ...p.ventas.map(v => v.clave), ...p.gastos.map(v => v.clave)]
  expect(new Set(ids).size).toBe(ids.length)
  expect(new Set(p.productos.map(v => v.categoriaCodigo))).toEqual(new Set(CODIGOS_CATEGORIA))
})

it("deriva los resultados mensuales de lineas y precios, excluye anulaciones y promedia 800000", () => {
  expect(resumirPlan()).toEqual([
    { mes: "2026-07", ventas: "1450000.00", compras: "650000.00", gastos: "140000.00", resultado: "660000.00" },
    { mes: "2026-08", ventas: "1620000.00", compras: "720000.00", gastos: "160000.00", resultado: "740000.00" },
    { mes: "2026-09", ventas: "1850000.00", compras: "810000.00", gastos: "170000.00", resultado: "870000.00" },
    { mes: "2026-10", ventas: "2020000.00", compras: "900000.00", gastos: "190000.00", resultado: "930000.00" },
    { mes: "2026-11", ventas: "960000.00", compras: "430000.00", gastos: "85000.00", resultado: "445000.00" },
  ])
  const media = resumirPlan().slice(0, 4).reduce((s, m) => s + decimalACentavos(m.resultado)!, BigInt(0)) / BigInt(4)
  expect(media).toBe(BigInt(80000000))
})

it("todas las entradas cumplen validadores comerciales y fechas del corte", () => {
  const p = crearPlanDemo()
  for (const c of p.compras) {
    expect(evaluarEntradaCompra({ fechaOperacion: c.fecha, proveedorId: c.proveedorId, lineas: c.lineas }).ok).toBe(true)
    expect(c.lineas.every(l => decimalACentavos(l.costoUnitario)! > BigInt(0))).toBe(true)
  }
  for (const v of p.ventas) expect(evaluarEntradaVenta({ fechaOperacion: v.fecha, lineas: v.lineas }).ok).toBe(true)
  for (const g of p.gastos) expect(entradaEgreso.safeParse({ claveSolicitud: g.clave, concepto: g.concepto, importe: g.importe, fechaOperacion: g.fecha }).success).toBe(true)
  for (const e of [...p.compras, ...p.ventas, ...p.gastos]) {
    expect(e.fecha >= "2026-07-01" && e.fecha <= CORTE_DEMO).toBe(true)
  }
})

it("simula cronologicamente stock, anulaciones y reserva 5 + 3 - 1 = 7", () => {
  const p = crearPlanDemo(), stock = new Map(p.productos.map(v => [v.id, v.inicial]))
  const eventos = [
    ...p.compras.map(c => ({ fecha: c.fecha, orden: 0, signo: 1, anulada: c.anulada, lineas: c.lineas })),
    ...p.ventas.map(v => ({ fecha: v.fecha, orden: 1, signo: -1, anulada: v.anulada, lineas: v.lineas })),
  ].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.orden - b.orden)
  for (const e of eventos) {
    for (const l of e.lineas) {
      expect(l.productoId).not.toBe(PRODUCTO_EXPOSICION.id)
      stock.set(l.productoId, stock.get(l.productoId)! + l.cantidad * e.signo)
      expect(stock.get(l.productoId)).toBeGreaterThanOrEqual(0)
    }
    if (e.anulada) for (const l of e.lineas) {
      stock.set(l.productoId, stock.get(l.productoId)! - l.cantidad * e.signo)
      expect(stock.get(l.productoId)).toBeGreaterThanOrEqual(0)
    }
  }
  expect([...stock.values()]).toContain(0)
  expect([...stock.values()]).toContain(2)
  expect([...stock.values()].some(v => v > 3)).toBe(true)
  expect(stock.get(PRODUCTO_EXPOSICION.id)).toBe(5)
  expect(stock.get(PRODUCTO_EXPOSICION.id)! + 3 - 1).toBe(7)
})
