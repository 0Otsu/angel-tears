import "server-only"
import { randomUUID } from "node:crypto"
import { and, eq, isNull } from "drizzle-orm"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import type { ExigirAdministradora } from "@/lib/modulos/autenticacion/contrato"
import { producto } from "@/lib/infraestructura/esquemas/producto"
import { esquemaReferenciaEdicion } from "./validacion-administrativa"
import { ErrorImagen, esquemaReferenciaImagen, type AlmacenImagen, type ImagenGuardada } from "./imagen-contrato"
import { validarArchivoImagen } from "./imagen-validacion"

type DependenciasImagen = { db: NodePgDatabase; exigir: ExigirAdministradora; almacen: AlmacenImagen }

export const crearCargaImagenProducto = (dependencias: DependenciasImagen) => crearGuardadoImagenProducto(dependencias, false)
export const crearReemplazoImagenProducto = (dependencias: DependenciasImagen) => crearGuardadoImagenProducto(dependencias, true)

function crearGuardadoImagenProducto({ db, exigir, almacen }: DependenciasImagen, reemplazo: boolean) {
  // Ante fallo de lectura no se destruye a ciegas. IDs nuevos nunca se reutilizan.
  async function limpiarSinReferencia(publicId: string): Promise<boolean> {
    try {
      const [referencia] = await db.select({ id: producto.id }).from(producto).where(eq(producto.imagenPublicId, publicId)).limit(1)
      if (!referencia) await almacen.eliminarImagen(publicId)
      return false
    } catch {
      console.error("[productos.imagen] limpieza pendiente", { recurso: publicId })
      return true
    }
  }
  return async function adjuntar(encabezados: Headers, referencia: unknown, contenido: Uint8Array): Promise<ImagenGuardada> {
    await exigir(encabezados)
    const validacion = esquemaReferenciaEdicion.safeParse(referencia)
    if (!validacion.success) throw new ErrorImagen("solicitud_invalida", 400)
    const { id, version } = validacion.data
    const [actual] = await db.select({ version: producto.version, imagen: producto.imagenAssetId, publicId: producto.imagenPublicId }).from(producto).where(eq(producto.id, id))
    if (!actual) throw new ErrorImagen("producto_inexistente", 404)
    if (!reemplazo && actual.imagen) throw new ErrorImagen("imagen_existente", 409)
    if (reemplazo && !actual.imagen) throw new ErrorImagen("imagen_requerida", 409)
    if (actual.version !== version) throw new ErrorImagen(reemplazo ? "version_desactualizada" : "conflicto_version", 409)
    await validarArchivoImagen(contenido)
    const publicId = `angel-tears/${process.env.NODE_ENV === "production" ? "produccion" : "desarrollo"}/productos/${id}/${randomUUID()}`
    let escrituraTerminada = false
    let persistiendo = false
    let resultado: ImagenGuardada | undefined
    try {
      const imagen = esquemaReferenciaImagen.parse(await almacen.almacenarImagen({ contenido, publicId }))
      if (imagen.publicId !== publicId) throw new ErrorImagen("error_proveedor", 502)
      persistiendo = true
      await db.transaction(async (tx) => {
        const [guardado] = await tx.update(producto).set({
          imagenAssetId: imagen.assetId, imagenPublicId: imagen.publicId, imagenVersionProveedor: imagen.versionProveedor,
          imagenUrlSegura: imagen.urlSegura, imagenAncho: imagen.ancho, imagenAlto: imagen.alto, imagenFormato: imagen.formato,
          version: version + 1, actualizadoEn: new Date(),
        }).where(and(eq(producto.id, id), eq(producto.version, version), reemplazo
          ? eq(producto.imagenPublicId, actual.publicId!) : isNull(producto.imagenAssetId))).returning({ id: producto.id })
        if (!guardado) throw new ErrorImagen("conflicto_version", 409)
        escrituraTerminada = true
      })
      resultado = { estado: "ok", productoId: id, version: version + 1, imagen }
    } catch (error) {
      // Un COMMIT sin acuse puede haber confirmado: nunca borrar un recurso referenciado.
      if (escrituraTerminada) {
        try {
          const [confirmado] = await db.select().from(producto).where(and(eq(producto.id, id), eq(producto.imagenPublicId, publicId)))
          if (confirmado) resultado = { estado: "ok", productoId: id, version: confirmado.version, imagen: esquemaReferenciaImagen.parse({
            assetId: confirmado.imagenAssetId, publicId: confirmado.imagenPublicId, versionProveedor: confirmado.imagenVersionProveedor,
            urlSegura: confirmado.imagenUrlSegura, ancho: confirmado.imagenAncho, alto: confirmado.imagenAlto, formato: confirmado.imagenFormato,
          }) }
        } catch {
          console.error("[productos.imagen] verificar confirmacion antes de limpiar", { recurso: publicId })
          throw new ErrorImagen("error_tecnico", 500)
        }
      }
      if (!resultado) {
        if (!(error instanceof ErrorImagen && error.codigo === "servicio_no_disponible")) await limpiarSinReferencia(publicId)
        if (error instanceof ErrorImagen || !reemplazo) throw error
        throw new ErrorImagen(persistiendo ? "error_persistencia" : "error_proveedor", persistiendo ? 500 : 502)
      }
    }
    if (!resultado) throw new ErrorImagen("error_tecnico", 500)
    // Fuera del try/tx: un destroy fallido JAMAS revierte ni compensa la nueva referencia.
    if (reemplazo && actual.publicId && await limpiarSinReferencia(actual.publicId)) resultado.limpiezaPendiente = true
    return resultado
  }
}
