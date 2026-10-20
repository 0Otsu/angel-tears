import { defineConfig } from "drizzle-kit"

// Variables locales (DATABASE_URL) desde .env.local, que Git ignora.
try {
  process.loadEnvFile(".env.local")
} catch {
  // Sin archivo local se usan las variables ya definidas en el entorno.
}

// Los schemas viven en lib/infraestructura/esquemas/*.ts, uno por modulo (ver blueprint).
// Las migraciones SQL se versionan en ./drizzle y se revisan antes de aplicarlas.
export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/infraestructura/esquemas/*.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  strict: true,
  verbose: true,
})
