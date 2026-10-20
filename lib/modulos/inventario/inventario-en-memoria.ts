// Doble de prueba del contrato de inventario (blueprint, seccion 6): permite que Productos y
// Compras avancen y se prueben sin esperar el schema real. Reproduce la semantica del contrato
// (verifica todo antes de modificar, sin efectos parciales) pero NO prueba concurrencia ni
// transacciones de PostgreSQL: eso se verifica con pruebas de integracion reales.

import {
  ErrorProductoSinSaldo,
  ErrorStockInsuficiente,
  type ComandoAplicarMovimientos,
  type ContratoInventario,
  type DisponibilidadProducto,
  type ResultadoAplicacion,
  type SaldoAfectado,
} from "@/lib/modulos/inventario/contrato"
import { calcularSaldoResultante, consolidarVariaciones } from "@/lib/modulos/inventario/reglas-stock"

export type MovimientoEnMemoria = {
  readonly productoId: string
  readonly delta: number
  readonly saldoResultante: number
  readonly actorId: string
  readonly origenId: string
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
      for (const variacion of comando.variaciones) {
        const final = afectados.find((a) => a.productoId === variacion.productoId)!
        movimientos.push({
          productoId: variacion.productoId,
          delta: variacion.delta,
          saldoResultante: final.saldoResultante,
          actorId: comando.actorId,
          origenId: variacion.origen.ajusteId,
        })
      }
      return { saldos: afectados, productosAfectados: afectados.map((a) => a.productoId) }
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
