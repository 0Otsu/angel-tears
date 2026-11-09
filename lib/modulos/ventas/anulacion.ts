import { eq } from "drizzle-orm"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import { venta, ventaLinea } from "@/lib/infraestructura/esquemas/venta"
import type { ContratoInventario, VariacionConOrigen } from "@/lib/modulos/inventario/contrato"
import type { ResultadoAnulacionVenta } from "@/lib/modulos/ventas/contrato"
import { cargarVenta } from "@/lib/modulos/ventas/lectura"

// Anulacion de una venta (change implement-sales, 4.2; decision F5): conserva la venta con su
// historia, reintegra el stock una sola vez y no se puede editar ni borrar. Todo corre en una
// transaccion: el estado y las reversas se confirman o se revierten juntos. Sin sesion ni Next:
// la Action debe exigir la Administradora y pasar su ID como `actorId`.

export async function anularVenta(
  db: NodePgDatabase,
  inventarioContrato: ContratoInventario,
  comando: { readonly ventaId: string; readonly actorId: string },
): Promise<ResultadoAnulacionVenta> {
  return db.transaction(async (tx): Promise<ResultadoAnulacionVenta> => {
    // Se bloquea la cabecera antes de leer nada: una segunda anulacion simultanea espera aqui, y al
    // continuar ve la venta ya anulada. Registrar una venta nueva no toca cabeceras existentes.
    const [cabecera] = await tx.select().from(venta).where(eq(venta.id, comando.ventaId)).for("update")
    if (!cabecera) return { estado: "no_encontrada" }
    if (cabecera.estado === "ANULADA") {
      return { estado: "ya_anulada", venta: await cargarVenta(tx, cabecera) }
    }

    const lineas = await tx.select({ id: ventaLinea.id }).from(ventaLinea).where(eq(ventaLinea.ventaId, cabecera.id))
    const originales = await inventarioContrato.consultarMovimientosDeOrigen(
      tx,
      lineas.map((l) => ({ tipo: "VENTA", ventaLineaId: l.id }) as const),
    )
    // Una reversa por movimiento original, con el signo opuesto y el mismo origen. Solo reintegra,
    // asi que no puede dejar un saldo negativo; si algun original ya estaba revertido, Inventario
    // lo rechaza (ErrorReversaInvalida) y la transaccion no deja efectos.
    const reversas: VariacionConOrigen[] = originales.map((o) => ({
      productoId: o.productoId,
      delta: -o.delta,
      origen: o.origen,
      reversaDe: o.id,
    }))
    const aplicado = await inventarioContrato.aplicarMovimientos(tx, { actorId: comando.actorId, variaciones: reversas })

    const [anulada] = await tx
      .update(venta)
      .set({ estado: "ANULADA", anuladoEn: new Date(), anuladoPorId: comando.actorId })
      .where(eq(venta.id, cabecera.id))
      .returning()

    return { estado: "ok", venta: await cargarVenta(tx, anulada), productosAfectados: aplicado.productosAfectados }
  })
}
