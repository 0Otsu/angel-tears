import { z } from "zod"
import { DIAS_SEMANA } from "./contrato"

function urlHttps(texto: string): URL | null {
  if (!/^https:\/\//i.test(texto) || /[\\\s]/.test(texto)) return null
  try {
    const url = new URL(texto)
    return url.protocol === "https:" && !url.username && !url.password && !url.port ? url : null
  } catch {
    return null
  }
}

function enlaceMapsValido(texto: string) {
  const url = urlHttps(texto)
  if (!url) return false
  const { hostname, pathname } = url
  if (hostname === "maps.app.goo.gl") return /^\/[a-z0-9_-]+\/?$/i.test(pathname)
  if (hostname === "goo.gl") return /^\/maps\/[a-z0-9_-]+\/?$/i.test(pathname)
  if (hostname === "maps.google.com" && pathname === "/") return true
  return ["google.com", "www.google.com", "maps.google.com"].includes(hostname)
    && (pathname === "/maps" || pathname.startsWith("/maps/"))
}

const hora = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Ingresá una hora válida.")
const esquemaFranja = z.strictObject({ apertura: hora, cierre: hora }).refine(
  ({ apertura, cierre }) => apertura < cierre,
  { path: ["cierre"], message: "El cierre debe ser posterior a la apertura, en el mismo día." },
)

export const esquemaFranjasDia = z.array(esquemaFranja).max(2, "Usá hasta dos franjas por día.")
  .refine(([primera, segunda]) => !segunda || primera.cierre <= segunda.apertura || segunda.cierre <= primera.apertura,
    "Las franjas de un mismo día no pueden superponerse.")
  .transform((franjas) => [...franjas].sort((a, b) => a.apertura.localeCompare(b.apertura)))

const whatsapp = z.string().trim().max(40).regex(/^\+?[\d ()-]+$/, "Ingresá el número con código de país.")
  .transform((valor) => valor.replace(/\D/g, ""))
  .pipe(z.string().regex(/^[1-9]\d{7,14}$/, "Ingresá entre 8 y 15 dígitos, incluido el código de país."))

const instagram = z.string().trim().max(250).transform((valor) => {
  if (!valor.includes("/")) return valor.replace(/^@/, "").toLowerCase()
  const url = urlHttps(valor)
  if (!url || !["instagram.com", "www.instagram.com"].includes(url.hostname)) return ""
  return (/^\/([^/]+)\/?$/.exec(url.pathname)?.[1] ?? "").toLowerCase()
}).pipe(z.string().regex(/^(?!.*\.\.)[a-z0-9_](?:[a-z0-9_.]{0,28}[a-z0-9_])?$/, "Ingresá un usuario o un enlace de perfil de Instagram."))

export const esquemaConfiguracionNegocio = z.strictObject({
  direccion: z.string().trim().min(1, "Ingresá la calle y el número.").max(160, "Usá hasta 160 caracteres."),
  localidad: z.string().trim().min(1, "Ingresá la localidad.").max(100, "Usá hasta 100 caracteres."),
  provincia: z.string().trim().min(1, "Ingresá la provincia.").max(100, "Usá hasta 100 caracteres."),
  referencia: z.string().trim().max(200, "Usá hasta 200 caracteres."),
  horarios: z.record(z.enum(DIAS_SEMANA), esquemaFranjasDia),
  comoLlegar: z.string().trim().max(2048).refine(enlaceMapsValido, "Ingresá un enlace HTTPS de Google Maps."),
  telefonoWhatsApp: whatsapp,
  usuarioInstagram: instagram,
})
