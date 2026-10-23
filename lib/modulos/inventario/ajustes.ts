import { and, eq } from "drizzle-orm"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import { ajusteStock, movimientoStock } from "@/lib/infraestructura/esquemas/inventario"
import {
  esErrorProductoSinSaldo,
  esErrorStockInsuficiente,
  type ContratoInventario,
} from "@/lib/modulos/inventario/contrato"
import {
  evaluarAjuste,
  type ErrorAjuste,
  type TipoAjuste,
} from "@/lib/modulos/inventario/reglas-ajuste"
import { calcularHuellaSolicitud, clasificarSolicitud } from "@/lib/modulos/inventario/solicitud"

// Registro de ajustes manuales y de saldo inicial (B3, B4, tarea 2.3). Sin sesion ni Next: la
// Action que lo llame debe exigir la Administradora y pasar su ID como `actorId`.

export type ComandoAjuste = {
  /** UUID de la operacion logica; el cliente lo conserva para reintentar sin duplicar. */
  readonly claveSolicitud: string
  readonly productoId: string
  readonly tipo: unknown
  readonly cantidad: unknown
  readonly motivo: unknown
  readonly actorId: string
}

export type AjusteRegistrado = {
  readonly id: string
  readonly productoId: string
  readonly tipo: TipoAjuste
  readonly cantidad: number
  readonly motivo: string
  readonly saldoResultante: number
}

export type ResultadoRegistroAjuste =
  /** `repetido` es true cuando la misma solicitud ya estaba confirmada: no hay un segundo efecto. */
  | { estado: "ok"; ajuste: AjusteRegistrado; repetido: boolean }
  | { estado: "datos_invalidos"; errores: ErrorAjuste[] }
  /** La misma clave ya se uso con otro contenido. */
  | { estado: "conflicto_solicitud" }
  | { estado: "stock_insuficiente"; disponible: number; requerido: number }
  | { estado: "producto_sin_saldo" }

export async function registrarAjuste(
  db: NodePgDatabase,
  inventarioContrato: ContratoInventario,
  comando: ComandoAjuste,
): Promise<ResultadoRegistroAjuste> {
  const evaluado = evaluarAjuste(comando)
  if (!evaluado.ok) return { estado: "datos_invalidos", errores: evaluado.errores }

  const huella = calcularHuellaSolicitud({
    productoId: comando.productoId,
    tipo: evaluado.tipo,
    cantidad: evaluado.cantidad,
    motivo: evaluado.motivo,
  })

  try {
    return await db.transaction(async (tx) => {
      const [insertado] = await tx
        .insert(ajusteStock)
        .values({
          productoId: comando.productoId,
          tipo: evaluado.tipo,
          cantidad: evaluado.cantidad,
          motivo: evaluado.motivo,
          actorId: comando.actorId,
          claveSolicitud: comando.claveSolicitud,
          huella,
        })
        // Si otra transaccion ya confirmo esa clave, no se inserta nada y se resuelve abajo.
        .onConflictDoNothing({ target: ajusteStock.claveSolicitud })
        .returning()

      if (!insertado) {
        const [existente] = await tx
          .select()
          .from(ajusteStock)
          .where(eq(ajusteStock.claveSolicitud, comando.claveSolicitud))
        if (clasificarSolicitud(existente.huella, huella) === "CONFLICTO") {
          return { estado: "conflicto_solicitud" } as const
        }
        const [movimiento] = await tx
          .select()
          .from(movimientoStock)
          .where(and(eq(movimientoStock.ajusteId, existente.id), eq(movimientoStock.tipo, "ORIGINAL")))
        return {
          estado: "ok",
          repetido: true,
          ajuste: {
            id: existente.id,
            productoId: existente.productoId,
            tipo: evaluado.tipo,
            cantidad: existente.cantidad,
            motivo: existente.motivo,
            saldoResultante: movimiento.saldoResultante,
          },
        } as const
      }

      // Si el saldo no alcanza, esto lanza y la transaccion revierte tambien el ajuste insertado.
      const resultado = await inventarioContrato.aplicarMovimientos(tx, {
        actorId: comando.actorId,
        variaciones: [
          {
            productoId: comando.productoId,
            delta: evaluado.delta,
            origen: { tipo: "AJUSTE", ajusteId: insertado.id },
          },
        ],
      })
      return {
        estado: "ok",
        repetido: false,
        ajuste: {
          id: insertado.id,
          productoId: insertado.productoId,
          tipo: evaluado.tipo,
          cantidad: insertado.cantidad,
          motivo: insertado.motivo,
          saldoResultante: resultado.saldos[0].saldoResultante,
        },
      } as const
    })
  } catch (error) {
    if (esErrorStockInsuficiente(error)) {
      return { estado: "stock_insuficiente", disponible: error.disponible, requerido: error.requerido }
    }
    if (esErrorProductoSinSaldo(error)) return { estado: "producto_sin_saldo" }
    throw error
  }
}
