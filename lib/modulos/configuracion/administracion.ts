import "server-only"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import { z } from "zod"
import { conAdministradora, type ExigirAdministradora } from "@/lib/modulos/autenticacion/contrato"
import type { ResultadoConfiguracion } from "./contrato"
import { guardarConfiguracionNegocio } from "./persistencia"
import { esquemaConfiguracionNegocio } from "./validacion"

export async function editarConfiguracionNegocio(
  db: NodePgDatabase, exigir: ExigirAdministradora, encabezados: Headers, entrada: unknown,
): Promise<ResultadoConfiguracion> {
  const autorizado = await conAdministradora(exigir, encabezados, async (): Promise<ResultadoConfiguracion> => {
    const validacion = esquemaConfiguracionNegocio.safeParse(entrada)
    if (!validacion.success) return { estado: "datos_invalidos", errores: z.flattenError(validacion.error).fieldErrors }
    await guardarConfiguracionNegocio(db, validacion.data)
    return { estado: "ok", configuracion: validacion.data }
  })
  return autorizado.estado === "ok" ? autorizado.valor : autorizado
}
