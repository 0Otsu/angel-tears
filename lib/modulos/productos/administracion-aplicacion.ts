import "server-only"
import { obtenerDb } from "@/lib/infraestructura/db"
import { exigirAdministradora } from "@/lib/modulos/autenticacion/exigir-administradora"
import { crearContratoInventario } from "@/lib/modulos/inventario/persistencia"
import { crearAdministracionProductos } from "./administracion"

export function obtenerAdministracionProductos() {
  const db = obtenerDb()
  return crearAdministracionProductos({
    db, exigir: exigirAdministradora, crearSaldoCero: crearContratoInventario(db).crearSaldoCero,
  })
}
