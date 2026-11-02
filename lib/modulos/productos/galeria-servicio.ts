import "server-only"
import { randomUUID } from "node:crypto"
import { and, asc, eq } from "drizzle-orm"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import { producto } from "@/lib/infraestructura/esquemas/producto"
import { productoMedia } from "@/lib/infraestructura/esquemas/producto-media"
import type { ExigirAdministradora } from "@/lib/modulos/autenticacion/contrato"
import { esquemaReferenciaEdicion } from "./validacion-administrativa"
import { ErrorImagen, esquemaReferenciaImagen, type AlmacenImagen } from "./imagen-contrato"
import { esquemaGaleria, MAXIMO_MEDIOS, type GaleriaProducto } from "./galeria-contrato"
import { validarArchivoImagen } from "./imagen-validacion"

export function crearGaleriaProductos({ db, exigir, almacen }: { db: NodePgDatabase; exigir: ExigirAdministradora; almacen: AlmacenImagen }) {
  const filas = (id: string) => db.select().from(productoMedia).where(eq(productoMedia.productoId, id)).orderBy(asc(productoMedia.orden))
  async function consultar(h: Headers, id: string): Promise<GaleriaProducto> {
    await exigir(h)
    // Una sola instantanea SQL para que version, principal y medios sean coherentes.
    return db.transaction(async tx => {
      const [p] = await tx.select().from(producto).where(eq(producto.id, id)).for("share")
      if (!p) throw new ErrorImagen("producto_inexistente", 404)
      const medios = await tx.select().from(productoMedia).where(eq(productoMedia.productoId, id)).orderBy(asc(productoMedia.orden))
      const principal = medios.find(m => m.principal)
      return esquemaGaleria.parse({ estado: "ok", productoId: id, version: p.version, medios, imagen: principal ? esquemaReferenciaImagen.parse(principal) : null })
    })
  }
  async function limpiar(publicId: string) {
    try {
      const [medio] = await db.select({ id: productoMedia.id }).from(productoMedia).where(eq(productoMedia.publicId, publicId)).limit(1)
      const [principal] = await db.select({ id: producto.id }).from(producto).where(eq(producto.imagenPublicId, publicId)).limit(1)
      if (!medio && !principal) await almacen.eliminarImagen(publicId)
      return false
    } catch { console.error("[productos.galeria] limpieza pendiente", { recurso: publicId }); return true }
  }
  function proyeccion(m?: typeof productoMedia.$inferSelect) {
    return { imagenAssetId: m?.assetId ?? null, imagenPublicId: m?.publicId ?? null, imagenVersionProveedor: m?.versionProveedor ?? null,
      imagenUrlSegura: m?.urlSegura ?? null, imagenAncho: m?.ancho ?? null, imagenAlto: m?.alto ?? null, imagenFormato: m?.formato ?? null }
  }
  async function guardar(h: Headers, referencia: unknown, contenido: Uint8Array, medioId?: string) {
    await exigir(h)
    const entrada = esquemaReferenciaEdicion.safeParse(referencia)
    if (!entrada.success) throw new ErrorImagen("solicitud_invalida", 400)
    const { id, version } = entrada.data
    const [p] = await db.select().from(producto).where(eq(producto.id, id))
    if (!p) throw new ErrorImagen("producto_inexistente", 404)
    if (p.version !== version) throw new ErrorImagen("conflicto_version", 409)
    const anteriores = await filas(id)
    const anterior = medioId ? anteriores.find(m => m.id === medioId) : undefined
    if (medioId && !anterior) throw new ErrorImagen("medio_inexistente", 404)
    if (!medioId && anteriores.length >= MAXIMO_MEDIOS) throw new ErrorImagen("limite_medios", 409)
    await validarArchivoImagen(contenido)
    const publicId = `angel-tears/${process.env.NODE_ENV === "production" ? "produccion" : "desarrollo"}/productos/${id}/${randomUUID()}`
    try {
      const imagen = esquemaReferenciaImagen.parse(await almacen.almacenarImagen({ contenido, publicId }))
      if (imagen.publicId !== publicId) throw new ErrorImagen("error_proveedor", 502)
      await db.transaction(async tx => {
        const [actual] = await tx.select().from(producto).where(eq(producto.id, id)).for("update")
        if (!actual || actual.version !== version) throw new ErrorImagen("conflicto_version", 409)
        const medios = await tx.select().from(productoMedia).where(eq(productoMedia.productoId, id))
        if (medioId) {
          const [cambiado] = await tx.update(productoMedia).set(imagen).where(and(eq(productoMedia.productoId, id), eq(productoMedia.id, medioId))).returning()
          if (!cambiado) throw new ErrorImagen("medio_inexistente", 404)
        } else {
          const orden = Array.from({ length: MAXIMO_MEDIOS }, (_, i) => i + 1).find(n => !medios.some(m => m.orden === n))
          if (!orden) throw new ErrorImagen("limite_medios", 409)
          await tx.insert(productoMedia).values({ ...imagen, productoId: id, orden, principal: medios.length === 0 })
        }
        const [principal] = await tx.select().from(productoMedia).where(and(eq(productoMedia.productoId, id), eq(productoMedia.principal, true)))
        await tx.update(producto).set({ ...proyeccion(principal), version: version + 1, actualizadoEn: new Date() }).where(eq(producto.id, id))
      })
    } catch (error) {
      // COMMIT ambiguo: comprobar antes de compensar. Un error de lectura nunca autoriza destroy.
      let confirmado: boolean
      try { confirmado = (await filas(id)).some(m => m.publicId === publicId) }
      catch { throw new ErrorImagen("error_tecnico", 500) }
      if (!confirmado) {
        if (!(error instanceof ErrorImagen && error.codigo === "servicio_no_disponible")) await limpiar(publicId)
        throw error instanceof ErrorImagen ? error : new ErrorImagen("error_persistencia", 500)
      }
    }
    const resultado = await consultar(h, id)
    if (anterior && await limpiar(anterior.publicId)) resultado.limpiezaPendiente = true
    if (resultado.version !== version + 1) throw new ErrorImagen("conflicto_version", 409)
    return resultado
  }
  async function cambiar(h: Headers, referencia: unknown, medioId: string, accion: "principal" | "quitar") {
    await exigir(h)
    const entrada = esquemaReferenciaEdicion.safeParse(referencia)
    if (!entrada.success) throw new ErrorImagen("solicitud_invalida", 400)
    const { id, version } = entrada.data
    let retirado: string | undefined
    await db.transaction(async tx => {
      const [p] = await tx.select().from(producto).where(eq(producto.id, id)).for("update")
      if (!p) throw new ErrorImagen("producto_inexistente", 404)
      if (p.version !== version) throw new ErrorImagen("conflicto_version", 409)
      const medios = await tx.select().from(productoMedia).where(eq(productoMedia.productoId, id)).orderBy(asc(productoMedia.orden))
      const medio = medios.find(m => m.id === medioId)
      if (!medio) throw new ErrorImagen("medio_inexistente", 404)
      if (accion === "quitar" && p.publicado && medios.length === 1) throw new ErrorImagen("ultima_imagen_publicada", 409)
      if (accion === "principal") {
        await tx.update(productoMedia).set({ principal: false }).where(eq(productoMedia.productoId, id))
        await tx.update(productoMedia).set({ principal: true }).where(eq(productoMedia.id, medioId))
      } else {
        await tx.delete(productoMedia).where(eq(productoMedia.id, medioId))
        retirado = medio.publicId
        if (medio.principal) {
          const siguiente = medios.find(m => m.id !== medioId)
          if (siguiente) await tx.update(productoMedia).set({ principal: true }).where(eq(productoMedia.id, siguiente.id))
        }
      }
      const [principal] = await tx.select().from(productoMedia).where(and(eq(productoMedia.productoId, id), eq(productoMedia.principal, true)))
      await tx.update(producto).set({ ...proyeccion(principal), version: version + 1, actualizadoEn: new Date() }).where(eq(producto.id, id))
    })
    const resultado = await consultar(h, id)
    if (retirado && await limpiar(retirado)) resultado.limpiezaPendiente = true
    if (resultado.version !== version + 1) throw new ErrorImagen("conflicto_version", 409)
    return resultado
  }
  return { consultar, guardar, cambiar }
}
