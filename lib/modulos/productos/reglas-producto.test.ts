import { describe, expect, it } from "vitest"
import { candidatosSlug, crearSlugBase } from "@/lib/modulos/productos/reglas-producto"
import { esquemaDatosProducto, normalizarPrecioDecimal } from "@/lib/modulos/productos/validacion"
import { CATEGORIAS_INICIALES } from "@/lib/modulos/productos/categorias"
import { ID_PRODUCTO_PRUEBA } from "@/pruebas/fixtures/productos"

const datosMinimos = { nombre: "Collar", precio: "123.45", categoriaCodigo: "collares" }

describe("datos de Producto (formato, no politica comercial pendiente)", () => {
  it("guarda datos minimos sin imagen ni valores opcionales inventados", () => {
    expect(esquemaDatosProducto.parse(datosMinimos)).toEqual({
      ...datosMinimos, descripcion: null, material: null, medida: null, color: null, cuidados: null,
    })
  })

  it.each(["nombre", "precio", "categoriaCodigo"])("rechaza la ausencia de %s por campo", (campo) => {
    const entrada: Record<string, unknown> = { ...datosMinimos }
    delete entrada[campo]
    const resultado = esquemaDatosProducto.safeParse(entrada)
    expect(resultado.success).toBe(false)
    if (!resultado.success) expect(resultado.error.issues[0].path).toEqual([campo])
  })

  it("rechaza nombre en blanco y categoria inventada", () => {
    expect(esquemaDatosProducto.safeParse({ ...datosMinimos, nombre: "   " }).success).toBe(false)
    expect(esquemaDatosProducto.safeParse({ ...datosMinimos, categoriaCodigo: "combos" }).success).toBe(false)
  })

  it("normaliza blancos opcionales y descarta saldo, slug o publicacion aportados por entrada", () => {
    expect(esquemaDatosProducto.parse({
      ...datosMinimos, nombre: " Collar ", material: " ", color: " azul ",
      saldo: 100, minimo: 3, slug: "ajeno", publicado: true, destacado: true,
    })).toEqual({
      ...datosMinimos, descripcion: null, material: null, medida: null, color: "azul", cuidados: null,
    })
  })

  it("usa las siete categorias aprobadas, con codigo unico y etiquetas de negocio", () => {
    expect(CATEGORIAS_INICIALES.map((c) => c.nombre)).toEqual([
      "Collares", "Pulseras", "Anillos", "Aros / Piercings", "Tobilleras", "Llaveros", "Flores eternas",
    ])
    expect(new Set(CATEGORIAS_INICIALES.map((c) => c.codigo)).size).toBe(7)
    for (const categoria of CATEGORIAS_INICIALES) {
      expect(esquemaDatosProducto.safeParse({ ...datosMinimos, categoriaCodigo: categoria.codigo }).success).toBe(true)
    }
  })
})

describe("precision exacta de precio numeric(18,2)", () => {
  it("conserva importes mayores que el rango entero exacto de number, sin redondear", () => {
    expect(normalizarPrecioDecimal("90071992547409.93")).toBe("90071992547409.93")
    expect(normalizarPrecioDecimal("9999999999999999.99")).toBe("9999999999999999.99")
    expect(normalizarPrecioDecimal("0010.5")).toBe("10.50")
  })

  it.each(["", "1.001", "10000000000000000", "1e3", "NaN", "Infinity", "1,50", "1.", ".5", " 1"])(
    "rechaza %s antes de un cast SQL que podria redondear", (precio) => {
      expect(esquemaDatosProducto.safeParse({ ...datosMinimos, precio }).success).toBe(false)
    },
  )

  it("representa cero y signo sin resolver su aceptacion comercial ni exponer un alta", () => {
    expect(normalizarPrecioDecimal("0")).toBe("0.00")
    expect(normalizarPrecioDecimal("-1.5")).toBe("-1.50")
    expect(normalizarPrecioDecimal("-0.00")).toBe("0.00")
  })
})

describe("slug de alta", () => {
  it("conserva un nombre legible, sin tildes y seguro para URL", () => {
    expect(crearSlugBase("  Llavero Corazón / Edición Ñandú!  ")).toBe("llavero-corazon-edicion-nandu")
    expect(crearSlugBase("✨" )).toBe("producto")
  })

  it("prepara alternativa estable por UUID sin modificar slugs reservados", () => {
    expect(candidatosSlug("Collar", ID_PRODUCTO_PRUEBA)).toEqual([
      "collar", `collar-${ID_PRODUCTO_PRUEBA}`,
    ])
  })
})
