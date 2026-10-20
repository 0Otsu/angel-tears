// Guard de la base de pruebas (ADR-006). Las pruebas de integracion y E2E pueden crear y
// borrar tablas, asi que solo se ejecutan contra una base local de pruebas. Modulo puro, sin
// dependencias de servidor, para poder usarlo tambien desde la configuracion de Playwright.
// Los mensajes nunca incluyen la URL: contiene la contrasena.

const HOSTS_LOCALES = new Set(["localhost", "127.0.0.1", "[::1]"])
const NOMBRE_BASE_PRUEBAS = /^[a-z0-9_]+_test$/

function describirBase(url: URL): string {
  return `${url.hostname}:${url.port || "5432"}${url.pathname}`
}

/**
 * Valida que `urlPruebas` apunte a una base local cuyo nombre termina en `_test` y que no sea
 * la misma base de desarrollo. Devuelve la URL validada o lanza un error sin secretos.
 */
export function validarUrlBdPruebas(urlPruebas: string | undefined, urlDesarrollo?: string): string {
  if (!urlPruebas) {
    throw new Error("Falta DATABASE_URL_TEST: las pruebas requieren una base aislada.")
  }
  let url: URL
  try {
    url = new URL(urlPruebas)
  } catch {
    throw new Error("DATABASE_URL_TEST no es una URL valida.")
  }
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error("DATABASE_URL_TEST debe usar el esquema postgresql://.")
  }
  if (!HOSTS_LOCALES.has(url.hostname)) {
    throw new Error("DATABASE_URL_TEST debe apuntar a una base local (localhost o 127.0.0.1).")
  }
  const nombreBase = decodeURIComponent(url.pathname.replace(/^\//, ""))
  if (!NOMBRE_BASE_PRUEBAS.test(nombreBase)) {
    throw new Error("El nombre de la base de pruebas debe terminar en _test.")
  }
  if (urlDesarrollo) {
    let esLaMisma = false
    try {
      esLaMisma = describirBase(new URL(urlDesarrollo)) === describirBase(url)
    } catch {
      // DATABASE_URL invalida: no afecta a la validacion de la base de pruebas.
    }
    if (esLaMisma) {
      throw new Error("DATABASE_URL_TEST no puede ser la misma base que DATABASE_URL.")
    }
  }
  return urlPruebas
}
