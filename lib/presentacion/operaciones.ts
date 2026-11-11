export type PeriodoOperaciones = "mes" | "anterior" | "todo" | "fechas"
export type FiltrosOperaciones = { estado: string; desde: string; hasta: string; periodo?: PeriodoOperaciones; pagina?: string }
export type ErroresOperaciones = Partial<Record<"estado" | "desde" | "hasta" | "periodo" | "pagina" | "limite", string>>
export function rangoMesOperaciones(ahora = new Date(), anterior = false) {
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Cordoba", year: "numeric", month: "2-digit" }).formatToParts(ahora)
  const fecha = new Date(Date.UTC(Number(partes.find(p => p.type === "year")!.value), Number(partes.find(p => p.type === "month")!.value) - (anterior ? 2 : 1), 1))
  const desde = fecha.toISOString().slice(0, 10)
  fecha.setUTCMonth(fecha.getUTCMonth() + 1, 0)
  return { desde, hasta: fecha.toISOString().slice(0, 10) }
}
export function periodoDeFiltros(f: FiltrosOperaciones): PeriodoOperaciones {
  return f.periodo ?? (f.desde || f.hasta ? "fechas" : "todo")
}
export function resolverFiltrosOperaciones(p: Record<string, string | string[] | undefined>, ahora = new Date()) {
  const errores: ErroresOperaciones = {}
  for (const campo of ["estado", "desde", "hasta", "periodo", "pagina"] as const) if (Array.isArray(p[campo])) errores[campo] = "Elegí un solo valor."
  const texto = (v: unknown) => typeof v === "string" ? v : ""
  let periodo = texto(p.periodo) || (p.desde !== undefined || p.hasta !== undefined ? texto(p.desde) || texto(p.hasta) ? "fechas" : "todo" : "mes")
  if (!["mes", "anterior", "todo", "fechas"].includes(periodo)) { errores.periodo = "Elegí un período válido."; periodo = "mes" }
  const fechas = periodo === "mes" || periodo === "anterior" ? rangoMesOperaciones(ahora, periodo === "anterior") : periodo === "todo" ? { desde: "", hasta: "" } : { desde: texto(p.desde), hasta: texto(p.hasta) }
  return { filtros: { ...fechas, estado: texto(p.estado), periodo: periodo as PeriodoOperaciones, pagina: p.pagina === undefined ? "1" : texto(p.pagina) }, errores }
}
export function enlaceOperaciones(ruta: string, f: FiltrosOperaciones, pagina = 1) {
  const p = new URLSearchParams({ periodo: periodoDeFiltros(f) })
  if (f.estado) p.set("estado", f.estado)
  if (periodoDeFiltros(f) === "fechas") { p.set("desde", f.desde); p.set("hasta", f.hasta) }
  if (pagina > 1) p.set("pagina", String(pagina))
  return `${ruta}?${p}`
}
