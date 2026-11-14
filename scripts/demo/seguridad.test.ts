import { expect, it, vi } from "vitest"
import { HOST_DEMO, MARCADOR_DEMO, leerDestinoDemo, exigirConfirmacion, verificarIdentidadDemo } from "./seguridad"

const url = `postgresql://neondb_owner:secreto-de-prueba@${HOST_DEMO}/neondb?sslmode=require&channel_binding=require`
it("solo acepta la conexion directa aprobada; no cae en DATABASE_URL", () => {
  expect(leerDestinoDemo({ DEMO_DATABASE_URL_DIRECT: url })).toBe(url)
  expect(() => leerDestinoDemo({ DATABASE_URL: url })).toThrow()
})
it.each([
  url.replace(HOST_DEMO, "comercio-real.neon.tech"), url.replace(".c-2.", "-pooler.c-2."),
  url.replace("/neondb?", "/angel_tears_real?"), url.replace("neondb_owner:", "otro:"),
  url.replace("sslmode=require", "sslmode=disable"), url + "&options=-csearch_path=otro",
  url + "&host=otro", url + "&sslmode=disable", url.replace("postgresql:", "http:"),
])("rechaza destinos y opciones peligrosos sin revelar el secreto", valor => {
  try { leerDestinoDemo({ DEMO_DATABASE_URL_DIRECT: valor }); throw Error("aceptado") }
  catch (error) { expect(String(error)).not.toContain("secreto-de-prueba"); expect(String(error)).toContain("rechazado") }
})
it("bloquea la ejecucion en Vercel y exige confirmacion distinta para reset", () => {
  expect(() => leerDestinoDemo({ DEMO_DATABASE_URL_DIRECT: url, VERCEL: "1" })).toThrow()
  expect(() => exigirConfirmacion([], "seed")).toThrow()
  expect(() => exigirConfirmacion(["--confirmar=seed:angel-tears-demo"], "restablecer")).toThrow()
  expect(() => exigirConfirmacion(["--confirmar=seed:angel-tears-demo", "--force"], "seed")).toThrow()
  exigirConfirmacion(["--confirmar=seed:angel-tears-demo"], "seed")
})
it("el marcador debe existir antes de escribir; verificar es solo lectura y puede informar su ausencia", async () => {
  const query = vi.fn().mockResolvedValue({ rows: [{ base: "neondb", rol: "neondb_owner", version: 180000, marcador: null }] })
  await expect(verificarIdentidadDemo({ query })).rejects.toThrow("marcador")
  await expect(verificarIdentidadDemo({ query }, false)).resolves.toMatchObject({ marcadorCorrecto: false })
  query.mockResolvedValue({ rows: [{ base: "neondb", rol: "neondb_owner", version: 180000, marcador: MARCADOR_DEMO }] })
  await expect(verificarIdentidadDemo({ query })).resolves.toMatchObject({ marcadorCorrecto: true })
  expect(query.mock.calls.every(([sql]) => sql.startsWith("SELECT "))).toBe(true)
})
