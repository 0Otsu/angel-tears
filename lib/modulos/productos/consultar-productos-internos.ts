import "server-only"
import { obtenerDb } from "@/lib/infraestructura/db"
import { exigirAdministradora } from "@/lib/modulos/autenticacion/exigir-administradora"
import { crearConsultarProductosInternos } from "@/lib/modulos/productos/consulta-interna"
import { leerProductosInternos } from "@/lib/modulos/productos/persistencia"

// Conexion compartida y perezosa: la lectura de Productos ocurre solo despues de validar
// la sesion real de Auth. Las fallas tecnicas se propagan sin conceder acceso.
export const consultarProductosInternos = crearConsultarProductosInternos(
  exigirAdministradora,
  (ids) => leerProductosInternos(obtenerDb(), ids),
)
