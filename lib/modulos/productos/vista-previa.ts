import "server-only"
import { eq } from "drizzle-orm"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import type { ExigirAdministradora } from "@/lib/modulos/autenticacion/contrato"
import { producto } from "@/lib/infraestructura/esquemas/producto"
import { leerDetalleProducto } from "@/lib/modulos/catalogo/consultas"
import { esquemaReferenciaEdicion } from "./validacion-administrativa"
import type { ResultadoVistaPrevia } from "./vista-previa-contrato"

export function crearConsultaVistaPrevia({ db, exigir }: { db: NodePgDatabase; exigir: ExigirAdministradora }) {
  return async (encabezados: Headers, referencia: unknown): Promise<ResultadoVistaPrevia> => {
    await exigir(encabezados)
    const entrada = esquemaReferenciaEdicion.safeParse(referencia)
    if (!entrada.success) return { estado: "datos_invalidos" }
    const detalle = await leerDetalleProducto(db, eq(producto.id, entrada.data.id))
    if (!detalle) return { estado: "no_encontrado" }
    if (detalle.version !== entrada.data.version) return { estado: "conflicto_version" }
    return { estado: "ok", ...detalle }
  }
}
