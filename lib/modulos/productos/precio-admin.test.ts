import { expect, it } from "vitest"
import { esquemaProductoAdministrativo } from "./validacion-administrativa"
it.each(["222", "222.5", "222.50", "12500", "12500.99"])("precio %s es valido sin exigir decimales", precio => {
  expect(esquemaProductoAdministrativo.safeParse({ nombre: "Collar", precio, categoriaCodigo: "collares" }).success).toBe(true)
})
it.each(["f222", "0", "-1", "222.555"])("precio %s se rechaza sin mensajes de almacenamiento", precio => {
  const resultado = esquemaProductoAdministrativo.safeParse({ nombre: "Collar", precio, categoriaCodigo: "collares" })
  expect(resultado.success).toBe(false)
  if (!resultado.success) expect(JSON.stringify(resultado.error.issues)).not.toContain("numeric(")
})
