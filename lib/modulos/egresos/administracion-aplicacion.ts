import "server-only"
import { obtenerDb } from "@/lib/infraestructura/db"
import { exigirAdministradora } from "@/lib/modulos/autenticacion/exigir-administradora"
import { crearAdministracionEgresos } from "./administracion"

export function obtenerAdministracionEgresos() {
  return crearAdministracionEgresos({ db: obtenerDb(), exigir: exigirAdministradora })
}
