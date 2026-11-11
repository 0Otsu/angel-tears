import type { ExigirAdministradora } from "@/lib/modulos/autenticacion/contrato"
import { centavosADecimal, decimalACentavos } from "@/lib/modulos/compras/dinero"
import { FUENTES, type FiltroFinanzas, type FuentesFinanzas, type LeerFinanzas, type PuntoEvolucion, type ResultadoFinanzas } from "./contrato"
import { resolverPeriodo } from "./periodo"

export function fuentesNoDisponibles(): FuentesFinanzas {
  return { ventas: { estado: "error" }, compras: { estado: "error" }, egresos: { estado: "error" } }
}

export function resultadoEconomico(ventas: string, compras: string, egresos: string): string {
  const importes = [ventas, compras, egresos].map(decimalACentavos)
  if (importes.some(v => v === null)) throw new Error("Importe de resumen inválido")
  const resultado = importes[0]! - importes[1]! - importes[2]!
  return `${resultado < BigInt(0) ? "-" : ""}${centavosADecimal(resultado < BigInt(0) ? -resultado : resultado)}`
}

export function crearConsultaFinanzas(exigir: ExigirAdministradora, leer: LeerFinanzas, reloj = () => new Date()) {
  return { async consultar(encabezados: Headers, filtro: FiltroFinanzas = {}, detalle = true): Promise<ResultadoFinanzas> {
    await exigir(encabezados)
    const validado = resolverPeriodo(filtro, reloj())
    if (validado.estado !== "ok") return validado
    let fuentes: FuentesFinanzas
    try { fuentes = await leer(validado.periodo, detalle) }
    catch { fuentes = fuentesNoDisponibles() }
    const { ventas, compras, egresos } = fuentes
    const completo = ventas.estado === "ok" && compras.estado === "ok" && egresos.estado === "ok"
    const resultado = completo ? resultadoEconomico(ventas.resumen.vigentes.total, compras.resumen.vigentes.total, egresos.resumen.vigentes.total) : null
    const puntos = new Map<string, PuntoEvolucion>()
    if (completo) for (const fuente of FUENTES) {
      const lectura = fuentes[fuente]
      if (lectura.estado !== "ok") continue
      for (const fila of lectura.evolucion) {
        const punto = puntos.get(fila.fecha) ?? { fecha: fila.fecha, ventas: "0.00", compras: "0.00", egresos: "0.00" }
        punto[fuente] = fila.total
        puntos.set(fila.fecha, punto)
      }
    }
    const sanas = FUENTES.flatMap(f => fuentes[f].estado === "ok" ? [fuentes[f]] : [])
    const operaciones = sanas.flatMap(f => f.operaciones).sort((a, b) => b.fecha.localeCompare(a.fecha) || a.tipo.localeCompare(b.tipo) || a.id.localeCompare(b.id))
    return { estado: "ok", periodo: validado.periodo, fuentes, resultado,
      evolucion: [...puntos.values()].sort((a, b) => a.fecha.localeCompare(b.fecha)), operaciones: operaciones.slice(0, 50), hayMas: operaciones.length > 50 || sanas.some(f => f.hayMas) }
  } }
}
