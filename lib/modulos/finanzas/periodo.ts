import { z } from "zod"
import type { ErroresPeriodo, FiltroFinanzas, PeriodoFinanzas } from "./contrato"

const fecha = z.iso.date().refine(v => !v.startsWith("0000"))
const mesValido = /^\d{4}-(0[1-9]|1[0-2])$/

export function mesActualFinanzas(ahora = new Date()): string {
  const partes = new Intl.DateTimeFormat("en", { timeZone: "America/Argentina/Cordoba", year: "numeric", month: "2-digit" }).formatToParts(ahora)
  return `${partes.find(p => p.type === "year")!.value}-${partes.find(p => p.type === "month")!.value}`
}

function resolverPeriodoBase(filtro: FiltroFinanzas, ahora = new Date()):
  { estado: "ok"; periodo: PeriodoFinanzas } | { estado: "datos_invalidos"; errores: ErroresPeriodo } {
  const errores: ErroresPeriodo = {}
  const modo = filtro.modo ?? "mes"
  if (modo !== "mes" && modo !== "rango" && modo !== "anio") errores.modo = "Elegí un período válido."
  const mes = filtro.mes ?? mesActualFinanzas(ahora)
  let desde = "", hasta = ""
  if (modo === "mes") {
    if (typeof mes !== "string" || !mesValido.test(mes) || mes.startsWith("0000")) errores.mes = "Elegí un mes válido."
    else {
      desde = `${mes}-01`
      const [anio, numeroMes] = mes.split("-").map(Number)
      const bisiesto = anio % 4 === 0 && (anio % 100 !== 0 || anio % 400 === 0)
      const dias = [31, bisiesto ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][numeroMes - 1]
      hasta = `${mes}-${dias}`
    }
  } else if (modo === "anio") {
    const anio = filtro.anio
    if (typeof anio !== "string" || !/^[0-9]{4}$/.test(anio) || anio === "0000") errores.anio = "Ingresá un año válido."
    else { desde = `${anio}-01-01`; hasta = `${anio}-12-31` }
  } else if (modo === "rango") {
    if (!fecha.safeParse(filtro.desde).success) errores.desde = "Ingresá una fecha inicial válida."
    else desde = filtro.desde as string
    if (!fecha.safeParse(filtro.hasta).success) errores.hasta = "Ingresá una fecha final válida."
    else hasta = filtro.hasta as string
    if (desde && hasta && desde > hasta) errores.hasta = "La fecha final no puede ser anterior a la inicial."
  }
  const tipo = filtro.tipo ?? "todos", estado = filtro.estado ?? "todos"
  if (!["todos", "compras", "egresos"].includes(tipo as string)) errores.tipo = "Elegí un tipo válido."
  if (!["todos", "vigente", "anulado"].includes(estado as string)) errores.estado = "Elegí un estado válido."
  if (Object.keys(errores).length) return { estado: "datos_invalidos", errores }
  const dias = (Date.parse(hasta) - Date.parse(desde)) / 86_400_000
  return { estado: "ok", periodo: { modo: modo as PeriodoFinanzas["modo"], mes: desde.slice(0, 7), desde, hasta,
    agrupacion: dias <= 92 ? "dia" : "mes", tipo: tipo as PeriodoFinanzas["tipo"], estado: estado as PeriodoFinanzas["estado"] } }
}

export function parametrosPeriodo(periodo: PeriodoFinanzas): URLSearchParams {
  return new URLSearchParams(periodo.modo === "semana" ? {modo:"semana",referencia:periodo.desde} : periodo.modo === "anio" ? { modo: "anio", anio: periodo.desde.slice(0, 4) } : periodo.modo === "mes" ? { modo: "mes", mes: periodo.mes } : { modo: "rango", desde: periodo.desde, hasta: periodo.hasta })
}

export function fechaActualFinanzas(ahora = new Date()): string {
 return new Intl.DateTimeFormat("sv",{timeZone:"America/Argentina/Cordoba",year:"numeric",month:"2-digit",day:"2-digit"}).format(ahora)
}
export function resolverPeriodo(filtro: FiltroFinanzas, ahora = new Date()): ReturnType<typeof resolverPeriodoBase> {
 if (filtro.referencia === undefined && filtro.modo !== "semana") return resolverPeriodoBase(filtro,ahora)
 const ref = filtro.referencia ?? fechaActualFinanzas(ahora)
 if (!fecha.safeParse(ref).success) return {estado:"datos_invalidos",errores:{referencia:"El período no es válido."}}
 const referencia = ref as string
 if (filtro.modo === "semana") {
  const d=new Date(referencia+"T12:00:00Z");d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));const desde=d.toISOString().slice(0,10);d.setUTCDate(d.getUTCDate()+6);const hasta=d.toISOString().slice(0,10)
  const r=resolverPeriodoBase({...filtro,modo:"rango",desde,hasta},ahora)
  return r.estado === "ok" ? {...r,periodo:{...r.periodo,modo:"semana"}} : r
 }
 return resolverPeriodoBase({...filtro,mes:referencia.slice(0,7),anio:referencia.slice(0,4)},ahora)
}
