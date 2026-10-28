import "server-only"
import { randomUUID } from "node:crypto"
import { and, eq, isNull } from "drizzle-orm"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import type { ExigirAdministradora } from "@/lib/modulos/autenticacion/contrato"
import { producto } from "@/lib/infraestructura/esquemas/producto"
import { esquemaReferenciaEdicion } from "./validacion-administrativa"
import { ErrorImagen, esquemaReferenciaImagen, type AlmacenImagen, type ImagenGuardada } from "./imagen-contrato"
import { validarArchivoImagen } from "./imagen-validacion"

export function crearCargaImagenProducto({ db, exigir, almacen }: { db: NodePgDatabase; exigir: ExigirAdministradora; almacen: AlmacenImagen }) {
  return async function adjuntar(encabezados: Headers, referencia: unknown, contenido: Uint8Array): Promise<ImagenGuardada> {
    await exigir(encabezados)
    const validacion = esquemaReferenciaEdicion.safeParse(referencia)
    if (!validacion.success) throw new ErrorImagen("solicitud_invalida", 400)
    const { id, version } = validacion.data
    const [actual] = await db.select({ version: producto.version, imagen: producto.imagenAssetId }).from(producto).where(eq(producto.id, id))
    if (!actual) throw new ErrorImagen("producto_inexistente", 404)
    if (actual.imagen) throw new ErrorImagen("imagen_existente", 409)
    if (actual.version !== version) throw new ErrorImagen("conflicto_version", 409)
    await validarArchivoImagen(contenido)
    const publicId = `angel-tears/${process.env.NODE_ENV === "production" ? "produccion" : "desarrollo"}/productos/${id}/${randomUUID()}`
    let escrituraTerminada = false
    try {
      const imagen = esquemaReferenciaImagen.parse(await almacen.almacenarImagen({ contenido, publicId }))
      if (imagen.publicId !== publicId) throw new ErrorImagen("error_proveedor", 502)
      await db.transaction(async (tx) => {
        const [guardado] = await tx.update(producto).set({
          imagenAssetId: imagen.assetId, imagenPublicId: imagen.publicId, imagenVersionProveedor: imagen.versionProveedor,
          imagenUrlSegura: imagen.urlSegura, imagenAncho: imagen.ancho, imagenAlto: imagen.alto, imagenFormato: imagen.formato,
          version: version + 1, actualizadoEn: new Date(),
        }).where(and(eq(producto.id, id), eq(producto.version, version), isNull(producto.imagenAssetId))).returning({ id: producto.id })
        if (!guardado) throw new ErrorImagen("conflicto_version", 409)
        escrituraTerminada = true
      })
      return { estado: "ok", productoId: id, version: version + 1, imagen }
    } catch (error) {
      // Un COMMIT sin acuse puede haber confirmado: nunca borrar un recurso referenciado.
      if (escrituraTerminada) {
        try {
          const [confirmado] = await db.select().from(producto).where(eq(producto.imagenPublicId, publicId))
          if (confirmado) return { estado: "ok", productoId: id, version: confirmado.version, imagen: esquemaReferenciaImagen.parse({
            assetId: confirmado.imagenAssetId, publicId: confirmado.imagenPublicId, versionProveedor: confirmado.imagenVersionProveedor,
            urlSegura: confirmado.imagenUrlSegura, ancho: confirmado.imagenAncho, alto: confirmado.imagenAlto, formato: confirmado.imagenFormato,
          }) }
        } catch {
          console.error("[productos.imagen] verificar confirmacion antes de limpiar", { recurso: publicId })
          throw new ErrorImagen("error_tecnico", 500)
        }
      }
      if (!(error instanceof ErrorImagen && error.codigo === "servicio_no_disponible")) {
        try { await almacen.eliminarImagen(publicId) } catch {
          console.error("[productos.imagen] limpieza pendiente", { recurso: publicId })
        }
      }
      throw error
    }
  }
}
