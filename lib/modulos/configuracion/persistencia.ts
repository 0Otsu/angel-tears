import "server-only"
import { eq, getTableColumns } from "drizzle-orm"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import { configuracionNegocio } from "@/lib/infraestructura/esquemas/configuracion-negocio"
import type { ConfiguracionNegocio } from "./contrato"

const ID_CONFIGURACION = 1
const { id, ...campos } = getTableColumns(configuracionNegocio)

export async function leerConfiguracionNegocio(db: NodePgDatabase): Promise<ConfiguracionNegocio> {
  const [datos] = await db.select(campos).from(configuracionNegocio).where(eq(id, ID_CONFIGURACION))
  if (!datos) throw new Error("Falta la configuración del negocio")
  return datos
}

export async function guardarConfiguracionNegocio(db: NodePgDatabase, datos: ConfiguracionNegocio): Promise<void> {
  await db.insert(configuracionNegocio).values({ id: ID_CONFIGURACION, ...datos })
    .onConflictDoUpdate({ target: id, set: datos })
}
