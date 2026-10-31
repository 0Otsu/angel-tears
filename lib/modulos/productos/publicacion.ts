import "server-only"
import { eq } from "drizzle-orm"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import { z } from "zod"
import { producto } from "@/lib/infraestructura/esquemas/producto"
import { conAdministradora, type ExigirAdministradora } from "@/lib/modulos/autenticacion/contrato"
import { esquemaReferenciaEdicion } from "./validacion-administrativa"

const esquemaComando = esquemaReferenciaEdicion.extend({
  accion: z.enum(["publicar", "ocultar", "destacar", "quitar_destacado"]),
}).strict()

export type ResultadoPublicacion =
  | { estado: "ok"; productoId: string; slug: string; version: number }
  | { estado: "sesion_requerida" | "datos_invalidos" | "no_encontrado" | "conflicto_version" | "imagen_requerida" | "error_tecnico" }

// Se valida la referencia YA persistida bajo el constraint de conjunto completo de P0.
// No prueba disponibilidad remota ni incorpora upload/SDK/contratos exclusivos de 2.2.
function referenciaUtilizable(fila: typeof producto.$inferSelect): boolean {
  try {
    const url = new URL(fila.imagenUrlSegura ?? "")
    return Boolean(fila.imagenAssetId?.trim() && fila.imagenPublicId?.trim() && fila.imagenVersionProveedor?.trim())
      && url.protocol === "https:" && !url.username && !url.password
      && (fila.imagenAncho ?? 0) > 0 && (fila.imagenAlto ?? 0) > 0
      && ["jpeg", "png", "webp"].includes(fila.imagenFormato ?? "")
  } catch { return false }
}

export function crearPublicacionProductos({ db, exigir }: { db: NodePgDatabase; exigir: ExigirAdministradora }) {
  return async (encabezados: Headers, entrada: unknown): Promise<ResultadoPublicacion> => {
    const autorizado = await conAdministradora(exigir, encabezados, async (): Promise<ResultadoPublicacion> => {
      const validacion = esquemaComando.safeParse(entrada)
      if (!validacion.success) return { estado: "datos_invalidos" }
      const { id, version, accion } = validacion.data
      return db.transaction(async (tx): Promise<ResultadoPublicacion> => {
        const [actual] = await tx.select().from(producto).where(eq(producto.id, id)).for("update")
        if (!actual) return { estado: "no_encontrado" }
        if (actual.version !== version) return { estado: "conflicto_version" }
        if (accion === "publicar" && !referenciaUtilizable(actual)) return { estado: "imagen_requerida" }
        const cambio = accion === "publicar" || accion === "ocultar"
          ? { publicado: accion === "publicar" } : { destacado: accion === "destacar" }
        await tx.update(producto).set({ ...cambio, version: version + 1, actualizadoEn: new Date() }).where(eq(producto.id, id))
        return { estado: "ok", productoId: id, slug: actual.slug, version: version + 1 }
      })
    })
    return autorizado.estado === "sesion_requerida" ? autorizado : autorizado.valor
  }
}
