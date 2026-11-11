import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import { venta } from "@/lib/infraestructura/esquemas/venta"
import { compra } from "@/lib/infraestructura/esquemas/compra"
import { egreso } from "@/lib/infraestructura/esquemas/egreso"

// Exclusivo de pruebas, con conexión validada por el guard en cada arnés llamador.
// Cabeceras controladas para probar proyecciones de lectura; no prueba ni reemplaza
// los servicios de registro, líneas o movimientos de los módulos fuente.
export async function crearDatosFinanzas(db: NodePgDatabase, actorId: string) {
  const base = () => ({ actorId, claveSolicitud: randomUUID(), huella: "fixture-lectura-finanzas" })
  const anulacion = { anuladoEn: new Date(), anuladoPorId: actorId }
  await db.insert(venta).values([
    { ...base(), fechaOperacion: "2020-01-01", total: "10.10" },
    { ...base(), fechaOperacion: "2020-01-31", total: "0.20" },
    { ...base(), fechaOperacion: "2020-01-15", total: "999.00", estado: "ANULADA", ...anulacion },
    { ...base(), fechaOperacion: "2019-12-31", total: "50.00" },
    { ...base(), fechaOperacion: "2020-02-01", total: "50.00" },
  ])
  await db.insert(compra).values([
    { ...base(), fechaOperacion: "2020-01-01", total: "3.10" },
    { ...base(), fechaOperacion: "2020-01-15", total: "999.00", estado: "ANULADA", ...anulacion },
  ])
  await db.insert(egreso).values([
    { ...base(), concepto: "Servicio de prueba financiera", fechaOperacion: "2020-01-31", importe: "2.20" },
    { ...base(), concepto: "Servicio anulado de prueba financiera", fechaOperacion: "2020-01-15", importe: "999.00", estado: "ANULADO", ...anulacion },
  ])
}

export async function limpiarDatosFinanzas(db: NodePgDatabase, actorId: string) {
  await db.delete(venta).where(eq(venta.actorId, actorId))
  await db.delete(compra).where(eq(compra.actorId, actorId))
  await db.delete(egreso).where(eq(egreso.actorId, actorId))
}
