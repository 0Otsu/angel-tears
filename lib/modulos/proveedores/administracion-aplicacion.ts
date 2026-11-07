import "server-only"
import { obtenerDb } from "@/lib/infraestructura/db"
import { exigirAdministradora } from "@/lib/modulos/autenticacion/exigir-administradora"
import { crearAdministracionProveedores } from "./administracion"

export function obtenerAdministracionProveedores() {
  return crearAdministracionProveedores({ db: obtenerDb(), exigir: exigirAdministradora })
}
