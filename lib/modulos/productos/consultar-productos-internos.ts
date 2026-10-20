import "server-only"
import { obtenerDb } from "@/lib/infraestructura/db"
import { exigirAdministradora } from "@/lib/modulos/autenticacion/exigir-administradora"
import { crearConsultarProductosInternos } from "@/lib/modulos/productos/consulta-interna"
import { leerProductosInternos } from "@/lib/modulos/productos/persistencia"

// Conexion existente y perezosa, solo despues de Auth. Hoy E0 falla cerrado, por lo que
// esta instancia no consulta la BD hasta que Emi conecte sesiones reales.
export const consultarProductosInternos = crearConsultarProductosInternos(
  exigirAdministradora,
  (ids) => leerProductosInternos(obtenerDb(), ids),
)
