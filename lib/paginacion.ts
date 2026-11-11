import { z } from "zod"

// Parametros tecnicos de lectura, compartidos sin reglas monetarias o de stock.
const numero = (v: unknown) => v === undefined || v === null || v === "" ? undefined : typeof v === "string" && /^\d+$/.test(v.trim()) ? Number(v.trim()) : v
export const limiteListado = z.preprocess(numero, z.number("Ingresá un límite entre 1 y 200.").int("Ingresá un límite entre 1 y 200.").min(1, "Ingresá un límite entre 1 y 200.").max(200, "Ingresá un límite entre 1 y 200.").default(25))
export const paginaListado = z.preprocess(numero, z.number("Ingresá una página válida.").int("Ingresá una página entera.").min(1, "La página debe ser de al menos uno.").max(1_000_000, "La página solicitada es demasiado grande.").default(1))
const entrada = z.object({ pagina: paginaListado, limite: limiteListado })
export type Paginacion = { pagina: number; porPagina: number; total: number; paginas: number }
export function validarPaginacion(filtro: { pagina?: unknown; limite?: unknown }) {
  return entrada.safeParse(filtro)
}
export function paginar(total: number, pagina: number, limite: number): Paginacion {
  const paginas = Math.max(1, Math.ceil(total / limite))
  return { pagina: Math.min(pagina, paginas), porPagina: limite, total, paginas }
}
