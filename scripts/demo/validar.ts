import { sql } from "drizzle-orm"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import { resumirPlan, PRODUCTO_EXPOSICION } from "./plan"
import { ErrorDemo } from "./seguridad"

/** Solo SELECT, con snapshot coherente. Valida el conjunto inicial antes de practicar. */
export async function validarDatosDemo(db: NodePgDatabase) {
  return db.transaction(async tx => {
    const conteos: Record<string, number> = {}
    for (const [tabla, esperado] of [["producto", 25], ["proveedor", 4], ["categoria", 7], ["compra", 25], ["venta", 200], ["egreso", 25]] as const) {
      const r = await tx.execute(sql`SELECT count(*)::int AS cantidad FROM ${sql.identifier(tabla)}`)
      conteos[tabla] = Number(r.rows[0].cantidad)
      if (conteos[tabla] !== esperado) throw new ErrorDemo(`Conteo inesperado en ${tabla}; no se cambia ningun dato.`)
    }
    for (const [tabla, estado, esperado] of [["compra", "ANULADA", 5], ["venta", "ANULADA", 10], ["egreso", "ANULADO", 5]] as const) {
      const r = await tx.execute(sql`SELECT count(*)::int AS cantidad FROM ${sql.identifier(tabla)} WHERE estado = ${estado}`)
      if (Number(r.rows[0].cantidad) !== esperado) throw new ErrorDemo(`Anulaciones inesperadas en ${tabla}.`)
    }
    const saldos = await tx.execute(sql`SELECT i.producto_id, i.cantidad, coalesce(sum(m.delta),0)::int AS movimientos
      FROM inventario i LEFT JOIN movimiento_stock m ON m.producto_id=i.producto_id GROUP BY i.producto_id, i.cantidad`)
    if (saldos.rows.length !== 25 || saldos.rows.some(r => Number(r.cantidad) < 0 || Number(r.cantidad) !== Number(r.movimientos))) {
      throw new ErrorDemo("El saldo no coincide con el historial de movimientos.")
    }
    const reservado = saldos.rows.find(r => r.producto_id === PRODUCTO_EXPOSICION.id)
    if (Number(reservado?.cantidad) !== 5) throw new ErrorDemo("El producto de exposicion no conserva sus cinco unidades iniciales.")
    for (const [cabecera, linea, fk, unitario] of [["compra", "compra_linea", "compra_id", "costo_unitario_historico"], ["venta", "venta_linea", "venta_id", "precio_unitario_historico"]] as const) {
      const r = await tx.execute(sql`SELECT c.id FROM ${sql.identifier(cabecera)} c LEFT JOIN ${sql.identifier(linea)} l ON l.${sql.identifier(fk)}=c.id
        GROUP BY c.id, c.total HAVING count(l.id)=0 OR c.total<>sum(l.subtotal) OR bool_or(l.subtotal<>l.cantidad*l.${sql.identifier(unitario)})`)
      if (r.rows.length) throw new ErrorDemo("Un importe de cabecera no coincide con sus lineas historicas.")
    }
    const meses = []
    for (const esperado of resumirPlan()) {
      const r = await tx.execute(sql`SELECT
        (SELECT coalesce(sum(total),0)::numeric(18,2)::text FROM venta WHERE estado='CONFIRMADA' AND to_char(fecha_operacion,'YYYY-MM')=${esperado.mes}) AS ventas,
        (SELECT coalesce(sum(total),0)::numeric(18,2)::text FROM compra WHERE estado='CONFIRMADA' AND to_char(fecha_operacion,'YYYY-MM')=${esperado.mes}) AS compras,
        (SELECT coalesce(sum(importe),0)::numeric(18,2)::text FROM egreso WHERE estado='CONFIRMADO' AND to_char(fecha_operacion,'YYYY-MM')=${esperado.mes}) AS gastos`)
      const actual = r.rows[0]
      if (actual.ventas !== esperado.ventas || actual.compras !== esperado.compras || actual.gastos !== esperado.gastos) {
        throw new ErrorDemo(`Importes inesperados en ${esperado.mes}.`)
      }
      meses.push(esperado)
    }
    const galeria = await tx.execute(sql`SELECT p.id FROM producto p LEFT JOIN producto_media m ON m.producto_id=p.id AND m.principal
      WHERE p.publicado AND (m.id IS NULL OR p.imagen_public_id IS DISTINCT FROM m.public_id)`)
    if (galeria.rows.length) throw new ErrorDemo("Hay productos publicados sin principal consistente.")
    const fechas = await tx.execute(sql`SELECT fecha_operacion FROM venta WHERE fecha_operacion>'2026-11-14'
      UNION ALL SELECT fecha_operacion FROM compra WHERE fecha_operacion>'2026-11-14'
      UNION ALL SELECT fecha_operacion FROM egreso WHERE fecha_operacion>'2026-11-14'`)
    if (fechas.rows.length) throw new ErrorDemo("Se encontraron operaciones posteriores al corte de demo.")
    return { estado: "ok", conteos, anulaciones: { compras: 5, ventas: 10, gastos: 5 },
      productoExposicion: { nombre: PRODUCTO_EXPOSICION.nombre, stock: 5 }, meses, stockCoherente: true, importesPorLineaCoherentes: true }
  }, { isolationLevel: "repeatable read", accessMode: "read only" })
}
