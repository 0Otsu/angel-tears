import { defineConfig, devices } from "@playwright/test"
import { validarUrlBdPruebas } from "./pruebas/guardia-url-bd"

// Variables locales (DATABASE_URL_TEST, etc.) desde .env.local, que Git ignora.
try {
  process.loadEnvFile(".env.local")
} catch {
  // Sin archivo local se usan las variables ya definidas en el entorno.
}

// Puerto propio para no chocar con `pnpm dev` (3000) ni con un servidor que apunte a la base
// de desarrollo.
const PUERTO = 3100
const urlBase = `http://localhost:${PUERTO}`

// El servidor de los E2E nunca usa la base de desarrollo: recibe DATABASE_URL_TEST ya validada
// por el guard o, si no esta configurada, una DATABASE_URL vacia. El valor vacio tambien evita
// que Next cargue la de .env.local, porque las variables del proceso tienen prioridad.
const urlBdPruebas = process.env.DATABASE_URL_TEST
  ? validarUrlBdPruebas(process.env.DATABASE_URL_TEST, process.env.DATABASE_URL)
  : ""

export default defineConfig({
  testDir: "./e2e",
  workers: 1, // una sola base de pruebas compartida entre tests
  forbidOnly: Boolean(process.env.CI),
  reporter: [["list"]],
  use: {
    baseURL: urlBase,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm build && pnpm start --port ${PUERTO}`,
    url: urlBase,
    reuseExistingServer: false,
    timeout: 180_000,
    // BETTER_AUTH_URL debe coincidir con el origen del servidor de los E2E (puerto propio): si
    // no, Better Auth rechaza las solicitudes por origen no confiable. El secreto lo carga Next
    // desde .env.local.
    env: { DATABASE_URL: urlBdPruebas, BETTER_AUTH_URL: urlBase },
  },
})
