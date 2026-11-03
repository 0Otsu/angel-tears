import "server-only"
import { obtenerDb } from "@/lib/infraestructura/db"
import { exigirAdministradora } from "@/lib/modulos/autenticacion/exigir-administradora"
import { crearAdministracionInventario } from "./administracion"
import { crearContratoInventario } from "./persistencia"

export function obtenerAdministracionInventario() {
  const db = obtenerDb()
  return crearAdministracionInventario({ db, exigir: exigirAdministradora, contrato: crearContratoInventario(db) })
}
