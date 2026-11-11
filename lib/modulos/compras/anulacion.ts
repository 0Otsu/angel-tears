import { eq } from "drizzle-orm"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import { compra, compraLinea } from "@/lib/infraestructura/esquemas/compra"
import type { FaltanteReversionCompra, LeerProductosParaCompra, ResultadoAnulacionCompra } from "@/lib/modulos/compras/contrato"
import { cargarCompra } from "@/lib/modulos/compras/lectura"
import { planificarAnulacion } from "@/lib/modulos/compras/reglas-anulacion"
import { esErrorStockInsuficiente, type ContratoInventario, type VariacionConOrigen } from "@/lib/modulos/inventario/contrato"

// Anulacion de una compra (tareas 4.3 y 4.4; decisiones E5, E6): conserva la compra con su
// historia, revierte el stock una sola vez y no se puede editar ni borrar. Todo corre en una
// transaccion: el estado y las reversas se confirman o se revierten juntos. Si alguna reversion
// dejaria un saldo negativo, se rechaza toda la anulacion sin efectos parciales. Sin sesion ni
// Next: la Action debe exigir la Administradora y pasar su ID como `actorId`.

export async function anularCompra(
  db: NodePgDatabase,
  inventarioContrato: ContratoInventario,
  leerProductos: LeerProductosParaCompra,
  comando: { readonly compraId: string; readonly actorId: string },
): Promise<ResultadoAnulacionCompra> {
  try {
    return await db.transaction(async (tx): Promise<ResultadoAnulacionCompra> => {
      // Se bloquea la cabecera antes de leer nada: una segunda anulacion simultanea espera aqui, y al
      // continuar ve la compra ya anulada. Registrar una compra nueva no toca cabeceras existentes.
      const [cabecera] = await tx.select().from(compra).where(eq(compra.id, comando.compraId)).for("update")
      if (!cabecera) return { estado: "no_encontrada" }
      if (cabecera.estado === "ANULADA") {
        return { estado: "ya_anulada", compra: await cargarCompra(tx, cabecera) }
      }

      const lineas = await tx.select({ id: compraLinea.id }).from(compraLinea).where(eq(compraLinea.compraId, cabecera.id))
      const originales = await inventarioContrato.consultarMovimientosDeOrigen(
        tx,
        lineas.map((l) => ({ tipo: "COMPRA", compraLineaId: l.id }) as const),
      )
      // Una reversa por movimiento original, con el signo opuesto y el mismo origen. Inventario
      // verifica bajo lock que ningun saldo quede negativo (ErrorStockInsuficiente) y que cada
      // original se revierta una sola vez (ErrorReversaInvalida); en ambos casos, sin efectos.
      const reversas: VariacionConOrigen[] = originales.map((o) => ({
        productoId: o.productoId,
        delta: -o.delta,
        origen: o.origen,
        reversaDe: o.id,
      }))
      const aplicado = await inventarioContrato.aplicarMovimientos(tx, { actorId: comando.actorId, variaciones: reversas })

      const [anulada] = await tx
        .update(compra)
        .set({ estado: "ANULADA", anuladoEn: new Date(), anuladoPorId: comando.actorId })
        .where(eq(compra.id, cabecera.id))
        .returning()

      return { estado: "ok", compra: await cargarCompra(tx, anulada), productosAfectados: aplicado.productosAfectados }
    })
  } catch (error) {
    if (!esErrorStockInsuficiente(error)) throw error
    return { estado: "reversion_bloqueada", faltantes: await describirFaltantes(db, inventarioContrato, leerProductos, comando.compraId, error) }
  }
}

// La transaccion ya se revirtio. Para informar a la Administradora todos los productos que no
// alcanzan (no solo el primero), se evalua la regla pura con los saldos actuales. Es informativo:
// la decision de bloquear ya la tomo Inventario bajo lock.
async function describirFaltantes(
  db: NodePgDatabase,
  inventarioContrato: ContratoInventario,
  leerProductos: LeerProductosParaCompra,
  compraId: string,
  causa: { productoId: string; disponible: number; requerido: number },
): Promise<FaltanteReversionCompra[]> {
  const lineas = await db.select().from(compraLinea).where(eq(compraLinea.compraId, compraId))
  const ids = [...new Set(lineas.map((l) => l.productoId))]
  const [saldos, productos] = await Promise.all([inventarioContrato.consultarDisponibilidad(ids), leerProductos(ids)])
  const nombres = new Map(lineas.map((l) => [l.productoId, l.nombreProductoHistorico]))
  for (const p of productos) if (!nombres.has(p.id)) nombres.set(p.id, p.nombre)
  const nombreDe = (id: string) => nombres.get(id) ?? "Producto"

  if (saldos.length === ids.length) {
    const plan = planificarAnulacion(
      { estado: "CONFIRMADA", lineas: lineas.map((l) => ({ productoId: l.productoId, cantidad: l.cantidad })) },
      new Map(saldos.map((s) => [s.productoId, s.saldo])),
    )
    if (plan.tipo === "BLOQUEADA") return plan.faltantes.map((f) => ({ ...f, nombreProducto: nombreDe(f.productoId) }))
  }
  // Si el saldo cambio entre el rechazo y esta lectura, se informa lo que vio Inventario al rechazar.
  return [{ productoId: causa.productoId, nombreProducto: nombreDe(causa.productoId), disponible: causa.disponible, requerido: causa.requerido }]
}
