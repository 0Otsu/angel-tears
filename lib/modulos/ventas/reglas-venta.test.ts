import { describe, expect, it } from "vitest"
import { calcularHuellaSolicitud, clasificarSolicitud } from "@/lib/modulos/inventario/solicitud"
import {
  calcularVenta,
  CONSUMIDOR_FINAL,
  contenidoDeSolicitud,
  esFechaOperacionValida,
  evaluarEntradaVenta,
  nombreDeComprador,
  type ProductoVendible,
} from "@/lib/modulos/ventas/reglas-venta"

const A = "a1111111-1111-4111-8111-111111111111"
const B = "b2222222-2222-4222-8222-222222222222"

const productos: ProductoVendible[] = [
  { id: A, nombre: "Collar de plata", precio: "10.10" },
  { id: B, nombre: "Pulsera", precio: "0.10" },
]

describe("fecha de operacion", () => {
  it("acepta fechas reales en formato ISO", () => {
    expect(esFechaOperacionValida("2026-11-09")).toBe(true)
    expect(esFechaOperacionValida("2028-02-29")).toBe(true)
  })

  it("rechaza formatos distintos, fechas inexistentes y tipos que no son texto", () => {
    expect(esFechaOperacionValida("09/11/2026")).toBe(false)
    expect(esFechaOperacionValida("2026-02-30")).toBe(false)
    expect(esFechaOperacionValida("2027-02-29")).toBe(false)
    expect(esFechaOperacionValida("2026-13-01")).toBe(false)
    expect(esFechaOperacionValida("2026-11-09T10:00:00Z")).toBe(false)
    expect(esFechaOperacionValida(20261109)).toBe(false)
    expect(esFechaOperacionValida(undefined)).toBe(false)
  })
})

describe("evaluarEntradaVenta", () => {
  const base = { fechaOperacion: "2026-11-09", lineas: [{ productoId: A, cantidad: 2 }] }

  it("acepta una venta valida sin comprador", () => {
    const resultado = evaluarEntradaVenta(base)

    expect(resultado).toEqual({
      ok: true,
      entrada: { fechaOperacion: "2026-11-09", comprador: null, lineas: [{ productoId: A, cantidad: 2 }] },
    })
  })

  it("recorta el comprador y trata vacio o solo espacios como Consumidor Final", () => {
    const conNombre = evaluarEntradaVenta({ ...base, comprador: "  Ana Pérez  " })
    const vacio = evaluarEntradaVenta({ ...base, comprador: "   " })
    const nulo = evaluarEntradaVenta({ ...base, comprador: null })

    expect(conNombre.ok && conNombre.entrada.comprador).toBe("Ana Pérez")
    expect(vacio.ok && vacio.entrada.comprador).toBeNull()
    expect(nulo.ok && nulo.entrada.comprador).toBeNull()
  })

  it("rechaza un comprador que no es texto", () => {
    expect(evaluarEntradaVenta({ ...base, comprador: 5 })).toEqual({
      ok: false,
      errores: [{ campo: "comprador", codigo: "COMPRADOR_INVALIDO" }],
    })
  })

  it("acepta cantidades como texto de formulario", () => {
    const resultado = evaluarEntradaVenta({ ...base, lineas: [{ productoId: A, cantidad: " 3 " }] })

    expect(resultado.ok && resultado.entrada.lineas[0].cantidad).toBe(3)
  })

  it("rechaza fecha invalida y venta sin lineas, y los informa juntos", () => {
    expect(evaluarEntradaVenta({ fechaOperacion: "ayer", lineas: [] })).toEqual({
      ok: false,
      errores: [
        { campo: "fechaOperacion", codigo: "FECHA_INVALIDA" },
        { campo: "lineas", codigo: "SIN_LINEAS" },
      ],
    })
    expect(evaluarEntradaVenta({ ...base, lineas: "x" }).ok).toBe(false)
  })

  it("senala la linea con producto o cantidad invalidos", () => {
    const resultado = evaluarEntradaVenta({
      ...base,
      lineas: [
        { productoId: A, cantidad: 1 },
        { productoId: "no-es-uuid", cantidad: 1 },
        { productoId: B, cantidad: 0 },
        { productoId: B, cantidad: 1.5 },
        { productoId: B, cantidad: "1e3" },
        { productoId: B, cantidad: -2 },
        null,
      ],
    })

    expect(resultado).toEqual({
      ok: false,
      errores: [
        { campo: "productoId", linea: 1, codigo: "PRODUCTO_INVALIDO" },
        { campo: "cantidad", linea: 2, codigo: "CANTIDAD_INVALIDA" },
        { campo: "cantidad", linea: 3, codigo: "CANTIDAD_INVALIDA" },
        { campo: "cantidad", linea: 4, codigo: "CANTIDAD_INVALIDA" },
        { campo: "cantidad", linea: 5, codigo: "CANTIDAD_INVALIDA" },
        { campo: "productoId", linea: 6, codigo: "PRODUCTO_INVALIDO" },
        { campo: "cantidad", linea: 6, codigo: "CANTIDAD_INVALIDA" },
      ],
    })
  })
})

describe("calcularVenta", () => {
  it("congela nombre y precio y calcula subtotales y total exactos en centavos", () => {
    const resultado = calcularVenta(
      [
        { productoId: A, cantidad: 3 },
        { productoId: B, cantidad: 3 },
      ],
      productos,
    )

    expect(resultado).toEqual({
      ok: true,
      total: "30.60",
      lineas: [
        { numeroLinea: 1, productoId: A, nombreProductoHistorico: "Collar de plata", cantidad: 3, precioUnitarioHistorico: "10.10", subtotal: "30.30" },
        { numeroLinea: 2, productoId: B, nombreProductoHistorico: "Pulsera", cantidad: 3, precioUnitarioHistorico: "0.10", subtotal: "0.30" },
      ],
    })
  })

  it("no acumula error de coma flotante: 3 x 0.10 + 0.20 es exactamente 0.50", () => {
    const resultado = calcularVenta(
      [{ productoId: B, cantidad: 3 }, { productoId: B, cantidad: 2 }],
      productos,
    )

    expect(resultado.ok && resultado.total).toBe("0.50")
  })

  it("no fusiona lineas repetidas del mismo producto", () => {
    const resultado = calcularVenta([{ productoId: A, cantidad: 1 }, { productoId: A, cantidad: 2 }], productos)

    expect(resultado.ok && resultado.lineas.map((l) => [l.numeroLinea, l.cantidad])).toEqual([[1, 1], [2, 2]])
    expect(resultado.ok && resultado.total).toBe("30.30")
  })

  it("rechaza toda la venta si el contrato de Producto no devolvio alguno", () => {
    const resultado = calcularVenta([{ productoId: A, cantidad: 1 }, { productoId: "x", cantidad: 1 }], productos)

    expect(resultado).toEqual({ ok: false, productosDesconocidos: ["x"] })
  })
})

describe("comprador y solicitud", () => {
  it("muestra Consumidor Final cuando no hay comprador", () => {
    expect(nombreDeComprador(null)).toBe(CONSUMIDOR_FINAL)
    expect(nombreDeComprador("Ana")).toBe("Ana")
  })

  it("la huella no depende de precios y detecta el cambio de contenido o de orden de lineas", () => {
    const entrada = { fechaOperacion: "2026-11-09", comprador: null, lineas: [{ productoId: A, cantidad: 1 }, { productoId: B, cantidad: 2 }] }
    const huella = calcularHuellaSolicitud(contenidoDeSolicitud(entrada))

    expect(clasificarSolicitud(huella, calcularHuellaSolicitud(contenidoDeSolicitud({ ...entrada })))).toBe("REPETIDA")
    expect(
      clasificarSolicitud(huella, calcularHuellaSolicitud(contenidoDeSolicitud({ ...entrada, comprador: "Ana" }))),
    ).toBe("CONFLICTO")
    expect(
      clasificarSolicitud(
        huella,
        calcularHuellaSolicitud(contenidoDeSolicitud({ ...entrada, lineas: [...entrada.lineas].reverse() })),
      ),
    ).toBe("CONFLICTO")
  })
})
