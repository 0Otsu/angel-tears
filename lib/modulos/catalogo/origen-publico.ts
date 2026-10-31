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
      || !host.includes(".") || isIP(host) || /(^|\.)(localhost|local|internal|lan)$/.test(host)) throw new Error()
    return url.origin
  } catch { throw new Error("SITE_URL debe ser un origen HTTPS publico, sin ruta, credenciales ni puerto local.") }
}
