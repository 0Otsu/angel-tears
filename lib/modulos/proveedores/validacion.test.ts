import { describe, expect, it } from "vitest"
import { esquemaProveedor } from "@/lib/modulos/proveedores/validacion"

describe("esquemaProveedor", () => {
  it("acepta solo el nombre y deja los opcionales en null", () => {
    expect(esquemaProveedor.parse({ nombre: "Distribuidora Sol" })).toEqual({
      nombre: "Distribuidora Sol",
      telefono: null,
      instagram: null,
      nota: null,
    })
  })

  it("normaliza espacios y cadenas vacias de los opcionales a null", () => {
    const datos = esquemaProveedor.parse({
      nombre: "  Mayorista  ",
      telefono: "  ",
      instagram: " @mayorista ",
      nota: "",
    })

    expect(datos).toEqual({ nombre: "Mayorista", telefono: null, instagram: "@mayorista", nota: null })
  })

  it("rechaza nombre ausente o solo espacios con error en el campo", () => {
    for (const entrada of [{}, { nombre: "" }, { nombre: "   " }]) {
      const resultado = esquemaProveedor.safeParse(entrada)
      expect(resultado.success).toBe(false)
      expect(!resultado.success && resultado.error.issues[0]?.path).toEqual(["nombre"])
    }
  })

  it("descarta campos no aprobados como CUIT", () => {
    const datos = esquemaProveedor.parse({ nombre: "X", cuit: "20-1" })

    expect(datos).not.toHaveProperty("cuit")
  })
})
