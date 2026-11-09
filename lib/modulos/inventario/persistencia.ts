import { and, asc, eq, inArray, or } from "drizzle-orm"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import { inventario, movimientoStock } from "@/lib/infraestructura/esquemas/inventario"
import {
  ErrorProductoSinSaldo,
  ErrorReversaInvalida,
  ErrorStockInsuficiente,
  type ContratoInventario,
  type MovimientoDeOrigen,
  type VariacionConOrigen,
  type MovimientoRegistrado,
  type OrigenMovimiento,
  type SaldoAfectado,
  type TransaccionLlamador,
  identificadorDeOrigen,
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

// Unico punto que conoce las columnas de origen de movimiento_stock. Cada origen nuevo (compra,
// venta) agrega su columna en su migracion y su caso aqui; una reversa repite las del original.
function columnasDeOrigen(origen: OrigenMovimiento) {
  return origen.tipo === "AJUSTE"
    ? { ajusteId: origen.ajusteId, ventaLineaId: null }
    : { ajusteId: null, ventaLineaId: origen.ventaLineaId }
}

function origenDeFila(fila: typeof movimientoStock.$inferSelect): OrigenMovimiento {
  return fila.ventaLineaId
    ? { tipo: "VENTA", ventaLineaId: fila.ventaLineaId }
    : { tipo: "AJUSTE", ajusteId: fila.ajusteId! }
}

function mismoOrigen(a: OrigenMovimiento, b: OrigenMovimiento): boolean {
  return identificadorDeOrigen(a) === identificadorDeOrigen(b)
}

const SQLSTATE_UNICA = "23505"
const RESTRICCION_REVERSA_UNICA = "movimiento_stock_reversa_de_unica"

type ErrorPg = { code?: string; constraint?: string; detail?: string; cause?: ErrorPg }

/**
 * Si `error` es la violacion de la unica de `reversa_de` (el movimiento ya tiene su reversa),
 * devuelve el ID repetido; con cualquier otro error, incluso otra unica, devuelve null y el
 * llamador lo propaga sin disfrazarlo de reversa. Drizzle puede envolver el error de pg en `cause`.
 */
export function movimientoYaRevertidoDe(error: unknown): string | null {
  const pg = [error as ErrorPg | null, (error as ErrorPg | null)?.cause].find((e) => e?.code === SQLSTATE_UNICA)
  if (!pg || pg.constraint !== RESTRICCION_REVERSA_UNICA) return null
  // detail: Key (reversa_de)=(<uuid>) already exists.
  return /\(reversa_de\)=\(([^)]+)\)/.exec(pg.detail ?? "")?.[1] ?? ""
}

// Se llama con los saldos del producto ya bloqueados: dos anulaciones del mismo movimiento
// comparten producto, asi que la segunda espera el lock y ve la reversa de la primera.
async function validarReversas(
  tx: TransaccionBd,
  variaciones: readonly VariacionConOrigen[],
): Promise<Map<string, typeof movimientoStock.$inferSelect>> {
  const pedidas = variaciones.filter((v) => v.reversaDe)
  const originales = new Map<string, typeof movimientoStock.$inferSelect>()
  if (pedidas.length === 0) return originales

  const ids = pedidas.map((v) => v.reversaDe!)
  const repetido = ids.find((id, i) => ids.indexOf(id) !== i)
  if (repetido) throw new ErrorReversaInvalida(repetido, "YA_REVERTIDO")

  const filas = await tx.select().from(movimientoStock).where(inArray(movimientoStock.id, ids))
  for (const fila of filas) originales.set(fila.id, fila)
  const yaRevertidos = new Set(
    (await tx.select({ de: movimientoStock.reversaDe }).from(movimientoStock).where(inArray(movimientoStock.reversaDe, ids)))
      .map((fila) => fila.de),
  )

  for (const variacion of pedidas) {
    const id = variacion.reversaDe!
    const original = originales.get(id)
    if (!original) throw new ErrorReversaInvalida(id, "NO_ENCONTRADO")
    if (original.tipo !== "ORIGINAL") throw new ErrorReversaInvalida(id, "NO_ES_ORIGINAL")
    if (original.productoId !== variacion.productoId) throw new ErrorReversaInvalida(id, "PRODUCTO_DISTINTO")
    if (!mismoOrigen(origenDeFila(original), variacion.origen)) throw new ErrorReversaInvalida(id, "ORIGEN_DISTINTO")
    if (variacion.delta !== -original.delta) throw new ErrorReversaInvalida(id, "DELTA_NO_OPUESTO")
    if (yaRevertidos.has(id)) throw new ErrorReversaInvalida(id, "YA_REVERTIDO")
  }
  return originales
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
      if (consolidadas.length === 0) return { saldos: [], movimientos: [], productosAfectados: [] }

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

      const originales = await validarReversas(tx, comando.variaciones)

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
          tipo: variacion.reversaDe ? ("REVERSA" as const) : ("ORIGINAL" as const),
          reversaDe: variacion.reversaDe ?? null,
          // La reversa hereda el origen del original (ya verificado igual al pedido).
          ...columnasDeOrigen(variacion.reversaDe ? origenDeFila(originales.get(variacion.reversaDe)!) : variacion.origen),
        }
      })
      let registrados: MovimientoRegistrado[]
      try {
        registrados = await tx
          .insert(movimientoStock)
          .values(movimientos)
          .returning({ id: movimientoStock.id, productoId: movimientoStock.productoId, delta: movimientoStock.delta, tipo: movimientoStock.tipo })
          .then((filas) => filas as MovimientoRegistrado[])
      } catch (error) {
        // Red de seguridad de la base: solo la unica de reversa_de se informa como YA_REVERTIDO.
        const repetido = movimientoYaRevertidoDe(error)
        if (repetido !== null) {
          throw new ErrorReversaInvalida(repetido || comando.variaciones.find((v) => v.reversaDe)!.reversaDe!, "YA_REVERTIDO")
        }
        throw error
      }

      return { saldos, movimientos: registrados, productosAfectados: saldos.map((s) => s.productoId) }
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

    async consultarMovimientosDeOrigen(transaccion, origenes) {
      const tx = comoTransaccionBd(transaccion)
      if (origenes.length === 0) return []
      const ajusteIds = origenes.flatMap((o) => (o.tipo === "AJUSTE" ? [o.ajusteId] : []))
      const ventaLineaIds = origenes.flatMap((o) => (o.tipo === "VENTA" ? [o.ventaLineaId] : []))
      // Un origen de cada tabla: se combinan con OR para una sola lectura ordenada.
      const porOrigen = or(
        ajusteIds.length ? inArray(movimientoStock.ajusteId, ajusteIds) : undefined,
        ventaLineaIds.length ? inArray(movimientoStock.ventaLineaId, ventaLineaIds) : undefined,
      )
      const filas = await tx
        .select()
        .from(movimientoStock)
        .where(and(eq(movimientoStock.tipo, "ORIGINAL"), porOrigen))
        .orderBy(asc(movimientoStock.creadoEn), asc(movimientoStock.id))
      const revertidos = new Set(
        filas.length === 0
          ? []
          : (await tx.select({ de: movimientoStock.reversaDe }).from(movimientoStock).where(inArray(movimientoStock.reversaDe, filas.map((f) => f.id))))
              .map((r) => r.de),
      )
      return filas.map((fila): MovimientoDeOrigen => ({
        id: fila.id,
        origen: origenDeFila(fila),
        productoId: fila.productoId,
        delta: fila.delta,
        revertido: revertidos.has(fila.id),
      }))
    },
  }
}
