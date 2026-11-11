import "server-only"
import { obtenerDb } from "@/lib/infraestructura/db"
import { exigirAdministradora } from "@/lib/modulos/autenticacion/exigir-administradora"
import { crearConsultaFinanzas } from "./agregacion"
import { crearLecturaFinanzas } from "./lectura"

export function obtenerConsultaFinanzas() {
  // Conexión diferida: la autorización sucede antes de abrir la transacción/consultas.
  return crearConsultaFinanzas(exigirAdministradora, (p, detalle) => crearLecturaFinanzas(obtenerDb())(p, detalle))
}
