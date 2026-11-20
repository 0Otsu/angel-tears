import "server-only"
import { createHash } from "node:crypto"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import { z } from "zod"
import { categoria } from "@/lib/infraestructura/esquemas/producto"
import { conAdministradora, type ExigirAdministradora } from "@/lib/modulos/autenticacion/contrato"
import type { ResultadoAltaCategoria } from "./administracion-contrato"

function limpiarNombre(nombre: string) {
  return nombre.normalize("NFKC").trim().replace(/\s+/gu, " ")
}

const esquemaNombre = z.string().max(250).transform(limpiarNombre).pipe(z.string().min(1).max(60))

export async function crearCategoria(
  db: NodePgDatabase, exigir: ExigirAdministradora, encabezados: Headers, entrada: unknown,
): Promise<ResultadoAltaCategoria> {
  const resultado = await conAdministradora(exigir, encabezados, async (): Promise<ResultadoAltaCategoria> => {
    const nombre = esquemaNombre.safeParse(entrada)
    if (!nombre.success) return { estado: "nombre_invalido" }

    const normalizado = nombre.data.toLowerCase()
    // Los códigos históricos son distintos. Las altas nuevas comparten la clave primaria
    // para un mismo nombre normalizado, incluso si llegan al mismo tiempo.
    const existentes = await db.select({ nombre: categoria.nombre }).from(categoria)
    if (existentes.some(fila => limpiarNombre(fila.nombre).toLowerCase() === normalizado)) {
      return { estado: "duplicada" }
    }

    const codigo = "cat-" + createHash("sha256").update(normalizado).digest("hex")
    const [creada] = await db.insert(categoria).values({ codigo, nombre: nombre.data })
      .onConflictDoNothing({ target: categoria.codigo }).returning()
    return creada ? { estado: "ok", categoria: creada } : { estado: "duplicada" }
  })
  return resultado.estado === "ok" ? resultado.valor : resultado
}
