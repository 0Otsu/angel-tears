import { asc, eq, inArray } from "drizzle-orm"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import { inventario, movimientoStock } from "@/lib/infraestructura/esquemas/inventario"
import {
  ErrorProductoSinSaldo,
  ErrorStockInsuficiente,
  type ContratoInventario,
  type SaldoAfectado,
  type TransaccionLlamador,
} from "@/lib/modulos/inventario/contrato"
import { calcularSaldoResultante, consolidarVariaciones } from "@/lib/modulos/inventario/reglas-stock"

// Implementacion con PostgreSQL del contrato de inventario (blueprint, seccion 6 y 7). Ninguna
// funcion abre ni confirma una transaccion propia: `crearSaldoCero` y `aplicarMovimientos`
// corren en la del llamador, de modo que saldo, movimientos y operacion de origen se confirman
// o se revierten juntos. Solo servidor.

type TransaccionBd = Parameters<Parameters<NodePgDatabase["transaction"]>[0]>[0]

// El contrato publico recibe una transaccion opaca para no cargar codigo de base de datos; aqui
// se la reconoce como la transaccion de Drizzle que el llamador abrio.
function comoTransaccionBd(tx: TransaccionLlamador): TransaccionBd {
  return tx as TransaccionBd
}

export function crearContratoInventario(db: NodePgDatabase): ContratoInventario {
  return {
    async crearSaldoCero(transaccion, productoId) {
      const tx = comoTransaccionBd(transaccion)
      // La PK impide un saldo duplicado; un producto inexistente falla por la FK.
      await tx.insert(inventario).values({ productoId })
    },

    async aplicarMovimientos(transaccion, comando) {
      const tx = comoTransaccionBd(transaccion)
      const consolidadas = consolidarVariaciones(comando.variaciones)
      if (consolidadas.length === 0) return { saldos: [], productosAfectados: [] }

      // Lock de las filas en orden de ID: dos operaciones que comparten productos las toman en
      // el mismo orden y no se bloquean entre si en circulo. La verificacion va despues del lock.
      const filas = await tx
        .select()
        .from(inventario)
        .where(
          inArray(
            inventario.productoId,
            consolidadas.map((c) => c.productoId),
          ),
        )
        .orderBy(asc(inventario.productoId))
        .for("update")
      const actuales = new Map(filas.map((fila) => [fila.productoId, fila]))

      const saldos: SaldoAfectado[] = []
      for (const { productoId, delta } of consolidadas) {
        const actual = actuales.get(productoId)
        if (!actual) throw new ErrorProductoSinSaldo(productoId)
        const calculo = calcularSaldoResultante(actual.cantidad, delta)
        if (!calculo.ok) {
          throw new ErrorStockInsuficiente(productoId, calculo.disponible, calculo.requerido)
        }
        saldos.push({
          productoId,
          saldoAnterior: actual.cantidad,
          saldoResultante: calculo.saldoResultante,
        })
      }

      for (const saldo of saldos) {
        await tx
          .update(inventario)
          .set({
            cantidad: saldo.saldoResultante,
            version: actuales.get(saldo.productoId)!.version + 1,
            actualizadoEn: new Date(),
          })
          .where(eq(inventario.productoId, saldo.productoId))
      }

      // Un movimiento por variacion original, con el saldo corrido producto a producto.
      const corrido = new Map(saldos.map((s) => [s.productoId, s.saldoAnterior]))
      const movimientos = comando.variaciones.map((variacion) => {
        const saldoResultante = corrido.get(variacion.productoId)! + variacion.delta
        corrido.set(variacion.productoId, saldoResultante)
        return {
          productoId: variacion.productoId,
          delta: variacion.delta,
          saldoResultante,
          actorId: comando.actorId,
          ajusteId: variacion.origen.ajusteId,
        }
      })
      await tx.insert(movimientoStock).values(movimientos)

      return { saldos, productosAfectados: saldos.map((s) => s.productoId) }
    },

    async consultarDisponibilidad(productoIds) {
      const ids = [...new Set(productoIds)]
      if (ids.length === 0) return []
      const filas = await db.select().from(inventario).where(inArray(inventario.productoId, ids))
      return filas.map((fila) => ({
        productoId: fila.productoId,
        hayStock: fila.cantidad > 0,
        saldo: fila.cantidad,
        minimo: fila.minimo,
      }))
    },
  }
}
