// Doble de prueba del contrato de inventario (blueprint, seccion 6): permite que Productos y
// Compras avancen y se prueben sin esperar el schema real. Reproduce la semantica del contrato
// (verifica todo antes de modificar, sin efectos parciales) pero NO prueba concurrencia ni
// transacciones de PostgreSQL: eso se verifica con pruebas de integracion reales.

import {
  ErrorProductoSinSaldo,
  ErrorReversaInvalida,
  ErrorStockInsuficiente,
  type ComandoAplicarMovimientos,
  type VariacionConOrigen,
  type ContratoInventario,
  type DisponibilidadProducto,
  type MovimientoDeOrigen,
  type MovimientoRegistrado,
  type ResultadoAplicacion,
  type SaldoAfectado,
} from "@/lib/modulos/inventario/contrato"
import { calcularSaldoResultante, consolidarVariaciones } from "@/lib/modulos/inventario/reglas-stock"

export type MovimientoEnMemoria = {
  readonly id: string
  readonly tipo: "ORIGINAL" | "REVERSA"
  readonly reversaDe: string | null
  readonly productoId: string
  readonly delta: number
  readonly saldoResultante: number
  readonly actorId: string
  readonly origenId: string
}

// Una reversa exige las mismas condiciones que la implementacion real (ver persistencia.ts).
function validarReversa(variacion: VariacionConOrigen, movimientos: readonly MovimientoEnMemoria[]) {
  const id = variacion.reversaDe!
  const original = movimientos.find((m) => m.id === id)
  if (!original) throw new ErrorReversaInvalida(id, "NO_ENCONTRADO")
  if (original.tipo !== "ORIGINAL") throw new ErrorReversaInvalida(id, "NO_ES_ORIGINAL")
  if (original.productoId !== variacion.productoId) throw new ErrorReversaInvalida(id, "PRODUCTO_DISTINTO")
  if (original.origenId !== variacion.origen.ajusteId) throw new ErrorReversaInvalida(id, "ORIGEN_DISTINTO")
  if (variacion.delta !== -original.delta) throw new ErrorReversaInvalida(id, "DELTA_NO_OPUESTO")
  if (movimientos.some((m) => m.reversaDe === id)) throw new ErrorReversaInvalida(id, "YA_REVERTIDO")
}

export type InventarioEnMemoria = ContratoInventario & {
  readonly movimientos: readonly MovimientoEnMemoria[]
  /** Fija saldo y minimo de un producto existente; solo para armar escenarios de prueba. */
  readonly cargar: (productoId: string, saldo: number, minimo?: number | null) => void
}

export function crearInventarioEnMemoria(): InventarioEnMemoria {
  const saldos = new Map<string, { saldo: number; minimo: number | null }>()
  const movimientos: MovimientoEnMemoria[] = []

  return {
    movimientos,
    cargar(productoId, saldo, minimo = null) {
      saldos.set(productoId, { saldo, minimo })
    },
    async crearSaldoCero(_tx, productoId) {
      if (saldos.has(productoId)) {
        throw new Error("El producto ya tiene saldo de inventario.")
      }
      saldos.set(productoId, { saldo: 0, minimo: null })
    },
    async aplicarMovimientos(_tx, comando: ComandoAplicarMovimientos): Promise<ResultadoAplicacion> {
      const consolidadas = consolidarVariaciones(comando.variaciones)
      const afectados: SaldoAfectado[] = []
      const pedidas = comando.variaciones.filter((v) => v.reversaDe)
      const repetido = pedidas.find((v, i) => pedidas.findIndex((o) => o.reversaDe === v.reversaDe) !== i)
      if (repetido) throw new ErrorReversaInvalida(repetido.reversaDe!, "YA_REVERTIDO")
      for (const variacion of pedidas) validarReversa(variacion, movimientos)
      // Primero se verifica todo; recien despues se modifica (sin efectos parciales).
      for (const { productoId, delta } of consolidadas) {
        const actual = saldos.get(productoId)
        if (!actual) throw new ErrorProductoSinSaldo(productoId)
        const calculo = calcularSaldoResultante(actual.saldo, delta)
        if (!calculo.ok) {
          throw new ErrorStockInsuficiente(productoId, calculo.disponible, calculo.requerido)
        }
        afectados.push({
          productoId,
          saldoAnterior: actual.saldo,
          saldoResultante: calculo.saldoResultante,
        })
      }
      for (const { productoId, saldoResultante } of afectados) {
        const actual = saldos.get(productoId)!
        saldos.set(productoId, { ...actual, saldo: saldoResultante })
      }
      const registrados: MovimientoRegistrado[] = []
      const corrido = new Map(afectados.map((a) => [a.productoId, a.saldoAnterior]))
      for (const variacion of comando.variaciones) {
        const saldoResultante = corrido.get(variacion.productoId)! + variacion.delta
        corrido.set(variacion.productoId, saldoResultante)
        const id = crypto.randomUUID()
        const tipo = variacion.reversaDe ? ("REVERSA" as const) : ("ORIGINAL" as const)
        registrados.push({ id, productoId: variacion.productoId, delta: variacion.delta, tipo })
        movimientos.push({
          id,
          tipo,
          reversaDe: variacion.reversaDe ?? null,
          productoId: variacion.productoId,
          delta: variacion.delta,
          saldoResultante,
          actorId: comando.actorId,
          origenId: variacion.origen.ajusteId,
        })
      }
      return { saldos: afectados, movimientos: registrados, productosAfectados: afectados.map((a) => a.productoId) }
    },
    async consultarMovimientosDeOrigen(_tx, origenes): Promise<MovimientoDeOrigen[]> {
      return movimientos
        .filter((m) => m.tipo === "ORIGINAL" && origenes.some((o) => o.ajusteId === m.origenId))
        .map((m) => ({
          id: m.id,
          origen: { tipo: "AJUSTE", ajusteId: m.origenId },
          productoId: m.productoId,
          delta: m.delta,
          revertido: movimientos.some((r) => r.reversaDe === m.id),
        }))
    },
    async consultarDisponibilidad(productoIds) {
      const resultado: DisponibilidadProducto[] = []
      for (const productoId of new Set(productoIds)) {
        const actual = saldos.get(productoId)
        if (actual) {
          resultado.push({ productoId, hayStock: actual.saldo > 0, ...actual })
        }
      }
      return resultado
    },
  }
}
