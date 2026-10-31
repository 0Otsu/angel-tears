import { describe, expect, it } from "vitest"
import { formatearPrecioPublico } from "./presentacion"
describe("precio publico exacto", () => {
  it("conserva centavos y enteros grandes", () => {
    expect(formatearPrecioPublico("1250.50")).toBe("$1.250,50")
    expect(formatearPrecioPublico("90071992547409.93")).toBe("$90.071.992.547.409,93")
    expect(formatearPrecioPublico("10.00")).toBe("$10")
  })
})
