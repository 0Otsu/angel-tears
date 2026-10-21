import { fileURLToPath } from "node:url"
import { configDefaults, defineConfig } from "vitest/config"

const raiz = fileURLToPath(new URL(".", import.meta.url))

// Variables locales (DATABASE_URL_TEST, etc.) desde .env.local, que Git ignora.
try {
  process.loadEnvFile(".env.local")
} catch {
  // Sin archivo local se usan las variables ya definidas en el entorno.
}

const excluir = [...configDefaults.exclude, ".next/**", "work/**", "e2e/**"]

// Tres proyectos (ADR-006): unitarias y de dominio sin base, componentes con DOM simulado y
// integracion contra PostgreSQL aislado. Los E2E de navegador los corre Playwright.
export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\//, replacement: raiz },
      { find: "server-only", replacement: `${raiz}pruebas/stubs/server-only.ts` },
    ],
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unitarias",
          environment: "node",
          include: ["**/*.test.ts"],
          exclude: [...excluir, "**/*.integracion.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "componentes",
          environment: "jsdom",
          include: ["**/*.test.tsx"],
          exclude: excluir,
          setupFiles: ["./pruebas/preparar-componentes.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integracion",
          environment: "node",
          include: ["**/*.integracion.test.ts"],
          exclude: excluir,
          globalSetup: ["./pruebas/preparar-integracion.ts"],
        },
      },
    ],
  },
})
