import { describe, expect, it, vi } from "vitest"
import { ErrorSesionRequerida } from "@/lib/modulos/autenticacion/contrato"
import { crearConsultaFinanzas, resultadoEconomico } from "./agregacion"
import { mesActualFinanzas, resolverPeriodo } from "./periodo"
import { importeFinanzas } from "@/lib/presentacion/finanzas"
import type { FuentesFinanzas, LecturaFuente } from "./contrato"

const identidad = { id: "admin", nombre: "Administradora", email: "prueba@example.com" }
const lectura = (total: string, fecha = "2020-01-15"): LecturaFuente => ({ estado: "ok", resumen: { desde: "2020-01-01", hasta: "2020-01-31", vigentes: { total, cantidad: 1 }, anuladas: { cantidad: 2 } }, evolucion: [{ fecha, total }], operaciones: [], hayMas: false })
const fuentes = (): FuentesFinanzas => ({ ventas: lectura("10.30"), compras: lectura("3.10"), egresos: lectura("2.20") })
const filtro = { mes: "2020-01" }

describe("Importes exactos y presentación", () => {
  it.each([
    ["0.30", "0.10", "0.20", "0.00"], ["0.10", "0.20", "0.00", "-0.10"],
    ["10.30", "3.10", "2.20", "5.00"], ["0", "0", "0", "0.00"],
    ["9999999999999999.99", "0.10", "0.20", "9999999999999999.69"],
  ])("%s menos %s menos %s = %s", (v, c, e, esperado) => expect(resultadoEconomico(v, c, e)).toBe(esperado))
  it("conserva signo en centavos negativos y precisión fuera del rango seguro de Number", () => {
    expect(importeFinanzas("-0.01")).toBe("−ARS $ 0,01")
    expect(importeFinanzas("9999999999999999.69")).toBe("ARS $ 9.999.999.999.999.999,69")
  })
  it("rechaza resúmenes monetarios inválidos sin redondear", () => expect(() => resultadoEconomico("1.001", "0", "0")).toThrow())
})

describe("Períodos por fecha comercial", () => {
  it("predetermina el mes de Córdoba, no el mes UTC", () => {
    expect(mesActualFinanzas(new Date("2026-03-01T01:00:00Z"))).toBe("2026-02")
    expect(resolverPeriodo({}, new Date("2026-03-01T01:00:00Z"))).toMatchObject({ estado: "ok", periodo: { desde: "2026-02-01", hasta: "2026-02-28" } })
  })
  it.each([["2020-02", "2020-02-29"], ["1900-02", "1900-02-28"], ["2000-02", "2000-02-29"], ["2026-11", "2026-11-30"]])("resuelve el mes %s", (mes, hasta) => expect(resolverPeriodo({ mes })).toMatchObject({ estado: "ok", periodo: { desde: `${mes}-01`, hasta } }))
  it.each([
    { mes: "2020-13" }, { mes: "0000-01" }, { modo: "hoy" }, { mes: ["2020-01"] },
    { modo: "rango", desde: "2020-02-30", hasta: "2020-03-01" },
    { modo: "rango", desde: "2020-02-01", hasta: "2020-01-31" },
    { modo: "rango", desde: "", hasta: "2020-03-01" }, { tipo: "venta" }, { estado: "inventado" },
  ])("rechaza fechas/filtros inválidos %j", f => expect(resolverPeriodo(f).estado).toBe("datos_invalidos"))
  it("admite un solo día y agrupa por mes un período largo", () => {
    expect(resolverPeriodo({ modo: "rango", desde: "2020-01-15", hasta: "2020-01-15" })).toMatchObject({ periodo: { agrupacion: "dia" } })
    expect(resolverPeriodo({ modo: "rango", desde: "2020-01-01", hasta: "2020-12-31" })).toMatchObject({ periodo: { agrupacion: "mes" } })
  })
})

describe("Consulta compartida Dashboard/Finanzas", () => {
  it("autoriza antes de abrir cualquier lectura; sin sesión no consulta", async () => {
    const leer = vi.fn(), exigir = vi.fn().mockRejectedValue(new ErrorSesionRequerida())
    await expect(crearConsultaFinanzas(exigir, leer).consultar(new Headers(), filtro)).rejects.toBeInstanceOf(ErrorSesionRequerida)
    expect(leer).not.toHaveBeenCalled()
  })
  it("no disimula un fallo técnico de autorización", async () => {
    const leer = vi.fn()
    await expect(crearConsultaFinanzas(async () => { throw Error("auth falló") }, leer).consultar(new Headers())).rejects.toThrow("auth falló")
    expect(leer).not.toHaveBeenCalled()
  })
  it("valida antes de leer y reutiliza exactamente el mismo cálculo para ambas vistas", async () => {
    const leer = vi.fn().mockResolvedValue(fuentes()), exigir = vi.fn().mockResolvedValue(identidad)
    const consulta = crearConsultaFinanzas(exigir, leer)
    expect((await consulta.consultar(new Headers(), { mes: "inválido" })).estado).toBe("datos_invalidos")
    expect(leer).not.toHaveBeenCalled()
    const detalle = await consulta.consultar(new Headers(), filtro)
    const resumen = await consulta.consultar(new Headers(), filtro, false)
    expect(detalle).toMatchObject({ resultado: "5.00" }); expect(resumen).toEqual(detalle)
    expect(leer.mock.calls.map(c => c[1])).toEqual([true, false])
    expect(exigir.mock.invocationCallOrder[0]).toBeLessThan(leer.mock.invocationCallOrder[0])
  })
  it("compone fechas dispersas sin fabricar movimientos ni contar anuladas", async () => {
    const f = fuentes(); f.compras = lectura("3.10", "2020-01-16")
    const r = await crearConsultaFinanzas(async () => identidad, async () => f).consultar(new Headers(), filtro)
    expect(r).toMatchObject({ resultado: "5.00", evolucion: [
      { fecha: "2020-01-15", ventas: "10.30", compras: "0.00", egresos: "2.20" },
      { fecha: "2020-01-16", ventas: "0.00", compras: "3.10", egresos: "0.00" },
    ] })
  })
  it("no sustituye una fuente fallida por cero ni pierde las sanas", async () => {
    const f = fuentes(); f.egresos = { estado: "error" }
    expect(await crearConsultaFinanzas(async () => identidad, async () => f).consultar(new Headers(), filtro)).toMatchObject({ resultado: null, fuentes: { ventas: f.ventas, compras: f.compras, egresos: { estado: "error" } }, evolucion: [] })
  })
  it("un corte no disponible no produce indicadores ficticios", async () => {
    expect(await crearConsultaFinanzas(async () => identidad, async () => { throw Error("conexión") }).consultar(new Headers(), filtro)).toMatchObject({ resultado: null, fuentes: { ventas: { estado: "error" }, compras: { estado: "error" }, egresos: { estado: "error" } } })
  })
  it("acota historia sin acotar resúmenes y avisa que hay más", async () => {
    const f = fuentes()
    if (f.egresos.estado === "ok") f.egresos.operaciones = Array.from({ length: 51 }, (_, i) => ({ id: String(i), tipo: "egresos", concepto: "Servicio", importe: "1.00", fecha: "2020-01-15", anulada: false }))
    const r = await crearConsultaFinanzas(async () => identidad, async () => f).consultar(new Headers(), filtro)
    expect(r).toMatchObject({ resultado: "5.00", hayMas: true })
    if (r.estado === "ok") expect(r.operaciones).toHaveLength(50)
  })
})

it("consulta un año completo y rechaza años inválidos",()=>{expect(resolverPeriodo({modo:"anio",anio:"2026"})).toMatchObject({estado:"ok",periodo:{desde:"2026-01-01",hasta:"2026-12-31",agrupacion:"mes"}});expect(resolverPeriodo({modo:"anio",anio:"0000"}).estado).toBe("datos_invalidos")})
