import { eq } from "drizzle-orm"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import { compra, compraLinea } from "@/lib/infraestructura/esquemas/compra"
import type {
  ComandoRegistrarCompra,
  LeerProductosParaCompra,
  ResultadoRegistroCompra,
} from "@/lib/modulos/compras/contrato"
import { cargarCompra, type Ejecutor } from "@/lib/modulos/compras/lectura"
import { calcularCompra, contenidoDeSolicitud, evaluarEntradaCompra } from "@/lib/modulos/compras/reglas-compra"
import { esErrorProductoSinSaldo, type ContratoInventario } from "@/lib/modulos/inventario/contrato"
import { calcularHuellaSolicitud, clasificarSolicitud } from "@/lib/modulos/inventario/solicitud"
import { obtenerProveedor } from "@/lib/modulos/proveedores/servicio"

// Registro de compras (tareas 4.1 y 4.2; decisiones E1-E4). Sin sesion ni Next: la Action que lo
// llame debe exigir la Administradora y pasar su ID como `actorId`. Cabecera, lineas e incremento
// de stock con sus movimientos se confirman o se revierten juntos, en una sola transaccion; el
// saldo solo cambia por el contrato de Inventario.

// La misma clave con el mismo contenido recupera el resultado ya confirmado; con otro contenido
// es un conflicto. No escribe nada.
async function resolverExistente(
  ejecutor: Ejecutor,
  existente: typeof compra.$inferSelect,
  huella: string,
): Promise<ResultadoRegistroCompra> {
  if (clasificarSolicitud(existente.huella, huella) === "CONFLICTO") return { estado: "conflicto_solicitud" }
  return { estado: "ok", compra: await cargarCompra(ejecutor, existente), repetido: true, productosAfectados: [] }
}

export async function registrarCompra(
  db: NodePgDatabase,
  inventarioContrato: ContratoInventario,
  leerProductos: LeerProductosParaCompra,
  comando: ComandoRegistrarCompra,
): Promise<ResultadoRegistroCompra> {
  const evaluado = evaluarEntradaCompra(comando)
  if (!evaluado.ok) return { estado: "datos_invalidos", errores: evaluado.errores }
  const { entrada } = evaluado
  const huella = calcularHuellaSolicitud(contenidoDeSolicitud(entrada))

  // Un reintento (respuesta perdida) se resuelve sin releer nada ni tocar stock.
  const [previa] = await db.select().from(compra).where(eq(compra.claveSolicitud, comando.claveSolicitud))
  if (previa) return resolverExistente(db, previa, huella)

  const productos = await leerProductos([...new Set(entrada.lineas.map((l) => l.productoId))])
  const nombres = new Map(productos.map((p) => [p.id, p.nombre]))
  const desconocidos = [...new Set(entrada.lineas.filter((l) => !nombres.has(l.productoId)).map((l) => l.productoId))]
  if (desconocidos.length > 0) return { estado: "producto_no_encontrado", productoIds: desconocidos }

  // Las lineas se validaron arriba; aqui solo se calculan subtotales y total con aritmetica exacta.
  const calculo = calcularCompra(entrada.lineas)
  if (!calculo.ok) throw new Error("La entrada de compra validada produjo un calculo invalido.")

  try {
    return await db.transaction(async (tx): Promise<ResultadoRegistroCompra> => {
      // El proveedor se lee dentro de la transaccion: el nombre congelado es el que existia al confirmar.
      let proveedorSnapshot: { id: string; nombre: string } | null = null
      if (entrada.proveedorId) {
        const proveedor = await obtenerProveedor(tx, entrada.proveedorId)
        if (!proveedor) return { estado: "proveedor_no_encontrado" }
        // Un proveedor inactivo no se ofrece en compras nuevas.
        if (!proveedor.activo) return { estado: "proveedor_inactivo" }
        proveedorSnapshot = { id: proveedor.id, nombre: proveedor.nombre }
      }

      const [cabecera] = await tx
        .insert(compra)
        .values({
          fechaOperacion: entrada.fechaOperacion,
          proveedorId: proveedorSnapshot?.id ?? null,
          nombreProveedorHistorico: proveedorSnapshot?.nombre ?? null,
          nota: entrada.nota,
          total: calculo.total,
          actorId: comando.actorId,
          claveSolicitud: comando.claveSolicitud,
          huella,
        })
        // Si otra transaccion ya confirmo esa clave, no se inserta nada y se resuelve abajo.
        .onConflictDoNothing({ target: compra.claveSolicitud })
        .returning()

      if (!cabecera) {
        const [existente] = await tx.select().from(compra).where(eq(compra.claveSolicitud, comando.claveSolicitud))
        return resolverExistente(tx, existente, huella)
      }

      const lineas = await tx
        .insert(compraLinea)
        .values(
          calculo.lineas.map((l) => ({
            compraId: cabecera.id,
            numeroLinea: l.numeroLinea,
            productoId: l.productoId,
            nombreProductoHistorico: nombres.get(l.productoId)!,
            cantidad: l.cantidad,
            costoUnitarioHistorico: l.costoUnitario,
            subtotal: l.subtotal,
          })),
        )
        .returning({ id: compraLinea.id, numeroLinea: compraLinea.numeroLinea })
      const idPorNumero = new Map(lineas.map((l) => [l.numeroLinea, l.id]))

      // Si algo falla aqui, la transaccion revierte tambien la cabecera y las lineas.
      const aplicado = await inventarioContrato.aplicarMovimientos(tx, {
        actorId: comando.actorId,
        variaciones: calculo.lineas.map((l) => ({
          productoId: l.productoId,
          delta: l.cantidad,
          origen: { tipo: "COMPRA", compraLineaId: idPorNumero.get(l.numeroLinea)! },
        })),
      })

      return {
        estado: "ok",
        compra: await cargarCompra(tx, cabecera),
        repetido: false,
        productosAfectados: aplicado.productosAfectados,
      }
    })
  } catch (error) {
    if (esErrorProductoSinSaldo(error)) return { estado: "producto_sin_saldo", productoId: error.productoId }
    throw error
  }
}
