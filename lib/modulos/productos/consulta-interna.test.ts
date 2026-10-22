import { describe, expect, it, vi } from "vitest"
import { crearExigirAdministradora, ErrorSesionRequerida } from "@/lib/modulos/autenticacion/contrato"
import { crearConsultarProductosInternos } from "@/lib/modulos/productos/consulta-interna"
import { consultarProductosInternos } from "@/lib/modulos/productos/consultar-productos-internos"
import { crearInventarioEnMemoria } from "@/lib/modulos/inventario/inventario-en-memoria"
import { calcularCompra } from "@/lib/modulos/compras/reglas-compra"
import { ID_OTRO_PRODUCTO_PRUEBA, ID_PRODUCTO_PRUEBA, productoInternoPrueba } from "@/pruebas/fixtures/productos"

const identidad = { id: "admin-prueba", nombre: "Prueba", email: "prueba@example.com" }
const exigir = crearExigirAdministradora(async () => identidad)

describe("contrato de consulta interna de Producto", () => {
  it("no lee nada sin sesion, incluso con lista vacia o IDs malformados", async () => {
    const leer = vi.fn()
    const consulta = crearConsultarProductosInternos(crearExigirAdministradora(async () => null), leer)
    for (const ids of [[], ["malformado"]]) {
      await expect(consulta(new Headers(), ids)).rejects.toBeInstanceOf(ErrorSesionRequerida)
    }
    expect(leer).not.toHaveBeenCalled()
  })

  it("propaga fallo tecnico de Auth sin consultar", async () => {
    const leer = vi.fn()
    const consulta = crearConsultarProductosInternos(crearExigirAdministradora(async () => {
      throw new Error("Auth no disponible")
    }), leer)
    await expect(consulta(new Headers(), [ID_PRODUCTO_PRUEBA])).rejects.toThrow("Auth no disponible")
    expect(leer).not.toHaveBeenCalled()
  })

  it("la instancia real propaga falta de configuracion de Auth sin conceder acceso", async () => {
    // Auth ya valida sesiones reales: falta de configuracion es una falla tecnica, no de sesion.
    vi.stubEnv("DATABASE_URL", "")
    try {
      await expect(consultarProductosInternos(new Headers(), [ID_PRODUCTO_PRUEBA]))
        .rejects.toThrow("Falta la variable de entorno DATABASE_URL.")
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it("rechaza IDs invalidos antes de leer y no consulta por lista vacia", async () => {
    const leer = vi.fn()
    const consulta = crearConsultarProductosInternos(exigir, leer)
    await expect(consulta(new Headers(), ["invalido"])).rejects.toThrow()
    await expect(consulta(new Headers(), [])).resolves.toEqual([])
    expect(leer).not.toHaveBeenCalled()
  })

  it("lee en lote sin duplicados e incluye ocultos, con precio exacto y sin campos ajenos", async () => {
    const leer = vi.fn(async () => [{ ...productoInternoPrueba, saldo: 50, costo: "1.00", token: "no-exponer" }])
    const consulta = crearConsultarProductosInternos(exigir, leer)
    const resultado = await consulta(new Headers(), [ID_PRODUCTO_PRUEBA, ID_PRODUCTO_PRUEBA, ID_OTRO_PRODUCTO_PRUEBA])
    expect(leer).toHaveBeenCalledExactlyOnceWith([ID_PRODUCTO_PRUEBA, ID_OTRO_PRODUCTO_PRUEBA])
    expect(resultado).toEqual([productoInternoPrueba])
    expect(JSON.parse(JSON.stringify(resultado))[0].precio).toBe("90071992547409.93")
  })

  it("no convierte un fallo de persistencia en lista vacia", async () => {
    const consulta = crearConsultarProductosInternos(exigir, async () => { throw new Error("BD no disponible") })
    await expect(consulta(new Headers(), [ID_PRODUCTO_PRUEBA])).rejects.toThrow("BD no disponible")
  })

  it("alimenta los contratos existentes de Inventario y Compras sin segundo Producto", async () => {
    const consulta = crearConsultarProductosInternos(exigir, async () => [productoInternoPrueba])
    const [producto] = await consulta(new Headers(), [ID_PRODUCTO_PRUEBA])
    const inventario = crearInventarioEnMemoria()
    await inventario.crearSaldoCero({}, producto.id)
    expect(await inventario.consultarDisponibilidad([producto.id])).toEqual([
      { productoId: producto.id, hayStock: false, saldo: 0, minimo: null },
    ])
    // El costo de compra es propio de su linea: no se toma del precio actual de venta.
    const compra = calcularCompra([{ productoId: producto.id, cantidad: 2, costoUnitario: "10.05" }])
    expect(compra).toMatchObject({ ok: true, total: "20.10", lineas: [{ productoId: producto.id }] })
  })
})
