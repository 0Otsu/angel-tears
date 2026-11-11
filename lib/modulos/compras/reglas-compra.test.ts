import { describe, expect, it } from "vitest"
import { calcularCompra, contenidoDeSolicitud, evaluarEntradaCompra } from "@/lib/modulos/compras/reglas-compra"

describe("calcularCompra", () => {
  it("calcula subtotales y total exactos para varias lineas", () => {
    const resultado = calcularCompra([
      { productoId: "a", cantidad: 3, costoUnitario: "10.05" },
      { productoId: "b", cantidad: 2, costoUnitario: "0.10" },
    ])

    expect(resultado).toEqual({
      ok: true,
      lineas: [
        { productoId: "a", cantidad: 3, costoUnitario: "10.05", numeroLinea: 1, subtotal: "30.15" },
        { productoId: "b", cantidad: 2, costoUnitario: "0.10", numeroLinea: 2, subtotal: "0.20" },
      ],
      total: "30.35",
    })
  })

  it("no fusiona lineas del mismo producto con costos distintos", () => {
    const resultado = calcularCompra([
      { productoId: "a", cantidad: 1, costoUnitario: "5.00" },
      { productoId: "a", cantidad: 1, costoUnitario: "6.00" },
    ])

    expect(resultado.ok && resultado.lineas).toHaveLength(2)
    expect(resultado.ok && resultado.total).toBe("11.00")
  })

  it("rechaza una compra sin lineas", () => {
    expect(calcularCompra([])).toEqual({ ok: false, errores: [], sinLineas: true })
  })

  it("rechaza costos con mas de dos decimales sin registro parcial", () => {
    const resultado = calcularCompra([
      { productoId: "a", cantidad: 1, costoUnitario: "1.00" },
      { productoId: "b", cantidad: 1, costoUnitario: "2.005" },
    ])

    expect(resultado).toEqual({
      ok: false,
      sinLineas: false,
      errores: [{ linea: 1, campo: "costoUnitario", codigo: "IMPORTE_INVALIDO" }],
    })
  })

  it("informa cantidad invalida y producto ausente por linea", () => {
    const resultado = calcularCompra([{ productoId: "", cantidad: 0, costoUnitario: "1.00" }])

    expect(resultado.ok).toBe(false)
    expect(!resultado.ok && resultado.errores.map((e) => e.campo)).toEqual(["productoId", "cantidad"])
  })
})

describe("evaluarEntradaCompra", () => {
  const UUID_A = "c1111111-1111-4111-8111-111111111111"
  const UUID_B = "c2222222-2222-4222-8222-222222222222"
  const valida = { fechaOperacion: "2026-11-03", lineas: [{ productoId: UUID_A, cantidad: 2, costoUnitario: "10" }] }

  it("acepta una compra sin proveedor ni nota y normaliza el costo a dos decimales", () => {
    expect(evaluarEntradaCompra(valida)).toEqual({
      ok: true,
      entrada: { fechaOperacion: "2026-11-03", proveedorId: null, nota: null, lineas: [{ productoId: UUID_A, cantidad: 2, costoUnitario: "10.00" }] },
    })
  })

  it("acepta cantidad como texto, proveedor y nota con espacios", () => {
    const r = evaluarEntradaCompra({ ...valida, proveedorId: UUID_B, nota: "  hola  ", lineas: [{ productoId: UUID_A, cantidad: " 3 ", costoUnitario: " 1.5 " }] })
    expect(r).toMatchObject({ ok: true, entrada: { proveedorId: UUID_B, nota: "hola", lineas: [{ cantidad: 3, costoUnitario: "1.50" }] } })
  })

  it("proveedor y nota vacios equivalen a no informarlos", () => {
    expect(evaluarEntradaCompra({ ...valida, proveedorId: "", nota: "   " })).toMatchObject({ ok: true, entrada: { proveedorId: null, nota: null } })
  })

  it("no inventa limites: acepta costo cero y cantidades grandes", () => {
    const r = evaluarEntradaCompra({ ...valida, lineas: [{ productoId: UUID_A, cantidad: 999999999, costoUnitario: "0" }] })
    expect(r).toMatchObject({ ok: true })
  })

  it("rechaza fecha inexistente, proveedor mal formado y nota que no es texto", () => {
    const r = evaluarEntradaCompra({ ...valida, fechaOperacion: "2026-02-30", proveedorId: "x", nota: 5 })
    expect(r).toEqual({
      ok: false,
      errores: [
        { campo: "fechaOperacion", codigo: "FECHA_INVALIDA" },
        { campo: "proveedorId", codigo: "PROVEEDOR_INVALIDO" },
        { campo: "nota", codigo: "NOTA_INVALIDA" },
      ],
    })
  })

  it("rechaza sin lineas", () => {
    expect(evaluarEntradaCompra({ ...valida, lineas: [] })).toEqual({ ok: false, errores: [{ campo: "lineas", codigo: "SIN_LINEAS" }] })
    expect(evaluarEntradaCompra({ ...valida, lineas: "x" })).toEqual({ ok: false, errores: [{ campo: "lineas", codigo: "SIN_LINEAS" }] })
  })

  it("reporta cada campo invalido de cada linea con su indice", () => {
    const r = evaluarEntradaCompra({
      ...valida,
      lineas: [
        { productoId: UUID_A, cantidad: 1, costoUnitario: "1" },
        { productoId: "x", cantidad: 0, costoUnitario: "10.505" },
        { productoId: UUID_B, cantidad: 1.5, costoUnitario: "-1" },
      ],
    })
    expect(r).toEqual({
      ok: false,
      errores: [
        { campo: "productoId", linea: 1, codigo: "PRODUCTO_INVALIDO" },
        { campo: "cantidad", linea: 1, codigo: "CANTIDAD_INVALIDA" },
        { campo: "costoUnitario", linea: 1, codigo: "IMPORTE_INVALIDO" },
        { campo: "cantidad", linea: 2, codigo: "CANTIDAD_INVALIDA" },
        { campo: "costoUnitario", linea: 2, codigo: "IMPORTE_INVALIDO" },
      ],
    })
  })

  it("rechaza costos con coma, notacion cientifica o texto", () => {
    for (const costoUnitario of ["1,5", "1e3", "abc", "", "1.", ".5"]) {
      expect(evaluarEntradaCompra({ ...valida, lineas: [{ productoId: UUID_A, cantidad: 1, costoUnitario }] }).ok).toBe(false)
    }
  })
})

describe("contenidoDeSolicitud", () => {
  const entrada = (costoUnitario: string) => {
    const r = evaluarEntradaCompra({ fechaOperacion: "2026-11-03", lineas: [{ productoId: "c1111111-1111-4111-8111-111111111111", cantidad: 1, costoUnitario }] })
    if (!r.ok) throw new Error("entrada invalida")
    return r.entrada
  }

  it("'10' y '10.00' producen el mismo contenido, y otro costo produce otro", () => {
    expect(contenidoDeSolicitud(entrada("10"))).toEqual(contenidoDeSolicitud(entrada("10.00")))
    expect(contenidoDeSolicitud(entrada("10"))).not.toEqual(contenidoDeSolicitud(entrada("10.01")))
  })
})
