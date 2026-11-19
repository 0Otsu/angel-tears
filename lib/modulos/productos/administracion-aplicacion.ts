import "server-only"
import { obtenerDb } from "@/lib/infraestructura/db"
import { exigirAdministradora } from "@/lib/modulos/autenticacion/exigir-administradora"
import { crearContratoInventario } from "@/lib/modulos/inventario/persistencia"
import { crearRegistroStockInicial } from "@/lib/modulos/inventario/ajustes"
import { crearAdministracionProductos } from "./administracion"

export function obtenerAdministracionProductos() {
  const db = obtenerDb()
  const inventario = crearContratoInventario(db)
  return crearAdministracionProductos({
    db, exigir: exigirAdministradora, crearSaldoCero: inventario.crearSaldoCero,
    registrarStockInicial: crearRegistroStockInicial(db, inventario),
  })
}
