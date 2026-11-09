import { eq } from "drizzle-orm"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import { venta, ventaLinea } from "@/lib/infraestructura/esquemas/venta"
import { cargarVenta, type Ejecutor } from "@/lib/modulos/ventas/lectura"
import {
  esErrorProductoSinSaldo,
  esErrorStockInsuficiente,
  type ContratoInventario,
} from "@/lib/modulos/inventario/contrato"
import { calcularHuellaSolicitud, clasificarSolicitud } from "@/lib/modulos/inventario/solicitud"
import type {
  ComandoRegistrarVenta,
  LeerProductosVendibles,
  ResultadoRegistroVenta,
} from "@/lib/modulos/ventas/contrato"
import { calcularVenta, contenidoDeSolicitud, evaluarEntradaVenta } from "@/lib/modulos/ventas/reglas-venta"

// Registro de ventas (change implement-sales, 3.1 y 3.2; decisiones F1-F7 y B6). Sin sesion ni
// Next: la Action que lo llame debe exigir la Administradora y pasar su ID como `actorId`.
// Cabecera, lineas y movimientos de stock se confirman o se revierten juntos, en una sola
// transaccion; el saldo solo cambia por el contrato de Inventario.

// La misma clave con el mismo contenido recupera el resultado ya confirmado; con otro contenido
// es un conflicto. No escribe nada.
async function resolverExistente(
  ejecutor: Ejecutor,
  existente: typeof venta.$inferSelect,
  huella: string,
): Promise<ResultadoRegistroVenta> {
  if (clasificarSolicitud(existente.huella, huella) === "CONFLICTO") return { estado: "conflicto_solicitud" }
  const detalle = await cargarVenta(ejecutor, existente)
  return { estado: "ok", venta: detalle, repetido: true, productosAfectados: [] }
}

export async function registrarVenta(
  db: NodePgDatabase,
  inventarioContrato: ContratoInventario,
  leerProductos: LeerProductosVendibles,
  comando: ComandoRegistrarVenta,
): Promise<ResultadoRegistroVenta> {
  const evaluado = evaluarEntradaVenta(comando)
  if (!evaluado.ok) return { estado: "datos_invalidos", errores: evaluado.errores }
  const { entrada } = evaluado
  const huella = calcularHuellaSolicitud(contenidoDeSolicitud(entrada))

  // Un reintento (respuesta perdida) se resuelve sin leer precios ni tocar stock.
  const [previa] = await db.select().from(venta).where(eq(venta.claveSolicitud, comando.claveSolicitud))
  if (previa) return resolverExistente(db, previa, huella)

  const productos = await leerProductos([...new Set(entrada.lineas.map((l) => l.productoId))])
  const calculo = calcularVenta(entrada.lineas, productos)
  if (!calculo.ok) return { estado: "producto_no_encontrado", productoIds: calculo.productosDesconocidos }

  try {
    return await db.transaction(async (tx): Promise<ResultadoRegistroVenta> => {
      const [cabecera] = await tx
        .insert(venta)
        .values({
          fechaOperacion: entrada.fechaOperacion,
          comprador: entrada.comprador,
          total: calculo.total,
          actorId: comando.actorId,
          claveSolicitud: comando.claveSolicitud,
          huella,
        })
        // Si otra transaccion ya confirmo esa clave, no se inserta nada y se resuelve abajo.
        .onConflictDoNothing({ target: venta.claveSolicitud })
        .returning()

      if (!cabecera) {
        const [existente] = await tx.select().from(venta).where(eq(venta.claveSolicitud, comando.claveSolicitud))
        return resolverExistente(tx, existente, huella)
      }

      const lineas = await tx
        .insert(ventaLinea)
        .values(calculo.lineas.map((l) => ({ ventaId: cabecera.id, ...l })))
        .returning({ id: ventaLinea.id, numeroLinea: ventaLinea.numeroLinea })
      const idPorNumero = new Map(lineas.map((l) => [l.numeroLinea, l.id]))

      // Si el stock no alcanza, esto lanza y la transaccion revierte tambien la cabecera y las lineas.
      const aplicado = await inventarioContrato.aplicarMovimientos(tx, {
        actorId: comando.actorId,
        variaciones: calculo.lineas.map((l) => ({
          productoId: l.productoId,
          delta: -l.cantidad,
          origen: { tipo: "VENTA", ventaLineaId: idPorNumero.get(l.numeroLinea)! },
        })),
      })

      return {
        estado: "ok",
        venta: await cargarVenta(tx, cabecera),
        repetido: false,
        productosAfectados: aplicado.productosAfectados,
      }
    })
  } catch (error) {
    if (esErrorStockInsuficiente(error)) {
      return {
        estado: "stock_insuficiente",
        productoId: error.productoId,
        disponible: error.disponible,
        requerido: error.requerido,
      }
    }
    if (esErrorProductoSinSaldo(error)) return { estado: "producto_sin_saldo", productoId: error.productoId }
    throw error
  }
}
