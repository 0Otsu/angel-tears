import { afterEach, expect, it, vi } from "vitest"
import robots from "./robots"
import sitemap from "./sitemap"
import { listarProductosIndexables } from "@/lib/modulos/catalogo/aplicacion"

vi.mock("@/lib/modulos/catalogo/aplicacion", () => ({ listarProductosIndexables: vi.fn() }))

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetAllMocks()
})

it("en preview no anuncia sitemap ni consulta la base y permite leer el noindex público", async () => {
  vi.stubEnv("ANGEL_TEARS_PREVIEW", "1")
  vi.stubEnv("SITE_URL", "https://tienda.example")
  expect(robots()).toEqual({ rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] } })
  expect(await sitemap()).toEqual([])
  expect(listarProductosIndexables).not.toHaveBeenCalled()
})

it("anuncia sitemap y URLs absolutas en el origen comercial", async () => {
  vi.stubEnv("ANGEL_TEARS_PREVIEW", "")
  vi.stubEnv("VERCEL_ENV", "")
  vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "")
  vi.stubEnv("BETTER_AUTH_URL", "")
  vi.stubEnv("SITE_URL", "https://tienda.example")
  const modificadoEn = new Date("2026-11-19T00:00:00Z")
  vi.mocked(listarProductosIndexables).mockResolvedValue([{ slug: "aro", modificadoEn }])
  expect(robots().sitemap).toBe("https://tienda.example/sitemap.xml")
  expect(await sitemap()).toEqual([
    { url: "https://tienda.example/" },
    { url: "https://tienda.example/catalogo" },
    { url: "https://tienda.example/catalogo/aro", lastModified: modificadoEn },
  ])
})
