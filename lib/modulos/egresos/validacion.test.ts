import { describe, expect, it } from "vitest"
import { entradaEgreso, filtroEgresos, mesActualEgresos } from "./validacion"
const dato = { concepto: " Alquiler ", importe: "00012.5", fechaOperacion: "2026-11-10", claveSolicitud: "a1111111-1111-4111-8111-111111111111" }
describe("validacion de egresos", () => {
  it("normaliza dinero exacto y textos sin fabricar observacion", () => {
    expect(entradaEgreso.parse(dato)).toMatchObject({ concepto: "Alquiler", importe: "12.50", nota: null })
    expect(entradaEgreso.parse({ ...dato, nota: " Luz " }).nota).toBe("Luz")
  })
  it.each(["0", "0.00", "-1", "1.001", "1,25", "NaN", "Infinity", "1e3", "10000000000000000", ""])("rechaza importe %s sin redondear", importe => {
    expect(entradaEgreso.safeParse({ ...dato, importe }).success).toBe(false)
  })
  it.each(["0.01", "9999999999999999.99"])("acepta limite tecnico exacto %s", importe => {
    expect(entradaEgreso.parse({ ...dato, importe }).importe).toBe(importe)
  })
  it.each(["0000-01-01", "2026-02-29", "2026-11-31", "2026-01-01T00:00:00Z", ""])("rechaza fecha %s", fechaOperacion => {
    expect(entradaEgreso.safeParse({ ...dato, fechaOperacion }).success).toBe(false)
  })
  it("requiere concepto y uuid, permite fecha historica sin limite comercial inventado", () => {
    expect(entradaEgreso.safeParse({ ...dato, concepto: " " }).success).toBe(false)
    expect(entradaEgreso.safeParse({ ...dato, claveSolicitud: "mal" }).success).toBe(false)
    expect(entradaEgreso.parse({ ...dato, fechaOperacion: "2024-02-29" }).fechaOperacion).toBe("2024-02-29")
  })
  it("valida rangos inclusivos, estados y limite", () => {
    expect(filtroEgresos.safeParse({ desde: "2026-11-02", hasta: "2026-11-01" }).success).toBe(false)
    expect(filtroEgresos.safeParse({ estado: "SQL" }).success).toBe(false)
    expect(filtroEgresos.safeParse({ limite: 0 }).success).toBe(false)
    expect(filtroEgresos.parse({ desde: "2026-11-01", hasta: "2026-11-01", limite: "1" }).limite).toBe(1)
  })
  it("mes actual en zona comercial aun en frontera UTC y febrero bisiesto", () => {
    expect(mesActualEgresos(new Date("2026-12-01T01:00:00Z"))).toEqual({ desde: "2026-11-01", hasta: "2026-11-30" })
    expect(mesActualEgresos(new Date("2024-02-15T12:00:00Z"))).toEqual({ desde: "2024-02-01", hasta: "2024-02-29" })
  })
})
