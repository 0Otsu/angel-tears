import "server-only"
import { isIP } from "node:net"

/** Configuracion explicita, nunca Host/forwarded headers, Better Auth ni default localhost. */
export function leerOrigenPublico(entorno: { SITE_URL?: string } = { SITE_URL: process.env.SITE_URL }): string | null {
  const valor = entorno.SITE_URL?.trim()
  if (!valor) return null
  try {
    const url = new URL(valor)
    const host = url.hostname.replace(/^\[|\]$/g, "")
    if (url.protocol !== "https:" || url.username || url.password || url.port || url.pathname !== "/" || url.search || url.hash
      || !host.includes(".") || host.endsWith(".") || isIP(host) || /(^|\.)(localhost|local|internal|lan)$/.test(host)) throw new Error()
    return url.origin
  } catch { throw new Error("SITE_URL debe ser un origen HTTPS publico, sin ruta, credenciales ni puerto local.") }
}

type EntornoIndexacion = {
  SITE_URL?: string
  ANGEL_TEARS_PREVIEW?: string
  VERCEL_ENV?: string
  VERCEL_PROJECT_PRODUCTION_URL?: string
  BETTER_AUTH_URL?: string
}

/** La demo puede tener un enlace para compartir sin ser un sitio comercial indexable. */
export function leerOrigenIndexable(entorno: EntornoIndexacion = {
  SITE_URL: process.env.SITE_URL,
  ANGEL_TEARS_PREVIEW: process.env.ANGEL_TEARS_PREVIEW,
  VERCEL_ENV: process.env.VERCEL_ENV,
  VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
}): string | null {
  const demo = "angel-tears-demo.vercel.app"
  if (entorno.ANGEL_TEARS_PREVIEW === "1" || entorno.VERCEL_ENV === "preview"
    || entorno.VERCEL_PROJECT_PRODUCTION_URL === demo
    || entorno.BETTER_AUTH_URL?.replace(/\/$/, "") === `https://${demo}`) return null

  const origen = leerOrigenPublico(entorno)
  if (origen && /\.(vercel\.app|up\.railway\.app)$/.test(new URL(origen).hostname)) return null
  return origen
}
