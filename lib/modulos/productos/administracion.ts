import "server-only"
import { and, asc, eq, sql } from "drizzle-orm"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import { categoria, producto } from "@/lib/infraestructura/esquemas/producto"
import { conAdministradora, type ExigirAdministradora } from "@/lib/modulos/autenticacion/contrato"
import type { CrearSaldoCero } from "@/lib/modulos/inventario/contrato"
import type { ConsultaAdministrativa, ResultadoGuardarProducto } from "./administracion-contrato"
import { insertarProductoOcultoConSaldo } from "./persistencia"
import { erroresProducto, esquemaProductoAdministrativo, esquemaReferenciaEdicion } from "./validacion-administrativa"

const camposAdministrativos = {
  id: producto.id, slug: producto.slug, nombre: producto.nombre, precio: producto.precio,
  categoriaCodigo: producto.categoriaCodigo, categoriaNombre: categoria.nombre,
  descripcion: producto.descripcion, material: producto.material, medida: producto.medida,
  color: producto.color, cuidados: producto.cuidados, publicado: producto.publicado,
  destacado: producto.destacado, version: producto.version,
  tieneImagen: sql<boolean>`${producto.imagenAssetId} IS NOT NULL`,
  imagenUrl: producto.imagenUrlSegura, imagenAncho: producto.imagenAncho, imagenAlto: producto.imagenAlto,
  imagenFormato: producto.imagenFormato,
}

export function crearAdministracionProductos(dependencias: {
  db: NodePgDatabase
  exigir: ExigirAdministradora
  crearSaldoCero: CrearSaldoCero
}) {
  const { db, exigir, crearSaldoCero } = dependencias

  async function consultar(encabezados: Headers, productoId?: string): Promise<ConsultaAdministrativa> {
    await exigir(encabezados)
    const [productos, categorias] = await Promise.all([
      db.select(camposAdministrativos).from(producto)
        .innerJoin(categoria, eq(producto.categoriaCodigo, categoria.codigo))
        .where(productoId ? eq(producto.id, productoId) : undefined)
        .orderBy(asc(producto.nombre), asc(producto.id)),
      db.select().from(categoria).orderBy(asc(categoria.nombre)),
    ])
    return { productos: productos.map(({ imagenUrl, imagenAncho, imagenAlto, imagenFormato, ...datos }) => ({
      ...datos,
      imagen: imagenUrl && imagenAncho && imagenAlto ? { urlSegura: imagenUrl, ancho: imagenAncho, alto: imagenAlto, ...(imagenFormato ? { formato: imagenFormato } : {}) } : null,
    })), categorias }
  }

  async function guardar(
    encabezados: Headers,
    entrada: unknown,
    referencia?: unknown,
  ): Promise<ResultadoGuardarProducto> {
    const autorizado = await conAdministradora(exigir, encabezados, async (): Promise<ResultadoGuardarProducto> => {
      const validacion = esquemaProductoAdministrativo.safeParse(entrada)
      if (!validacion.success) return { estado: "datos_invalidos", errores: erroresProducto(validacion.error) }
      const edicion = referencia === undefined ? null : esquemaReferenciaEdicion.safeParse(referencia)
      if (edicion && !edicion.success) return { estado: "datos_invalidos", errores: erroresProducto(edicion.error) }

      return db.transaction(async (tx): Promise<ResultadoGuardarProducto> => {
        const [categoriaActual] = await tx.select({ codigo: categoria.codigo }).from(categoria)
          .where(eq(categoria.codigo, validacion.data.categoriaCodigo))
        if (!categoriaActual) {
          return { estado: "datos_invalidos", errores: { categoriaCodigo: "La categoría ya no está disponible. Elegí otra." } }
        }
        if (!edicion) {
          const id = crypto.randomUUID()
          await insertarProductoOcultoConSaldo(tx, id, validacion.data, crearSaldoCero)
          return { estado: "ok", productoId: id }
        }
        if (!edicion.success) throw new Error("Referencia de edicion no validada")
        const { id, version } = edicion.data
        // Allowlist validada: nunca escribir slug, stock, flags o referencia de imagen.
        const [actualizado] = await tx.update(producto)
          .set({ ...validacion.data, version: version + 1, actualizadoEn: new Date() })
          .where(and(eq(producto.id, id), eq(producto.version, version)))
          .returning({ id: producto.id })
        if (actualizado) return { estado: "ok", productoId: id }
        const [existente] = await tx.select({ id: producto.id }).from(producto).where(eq(producto.id, id))
        return { estado: existente ? "conflicto_version" : "no_encontrado" }
      })
    })
    return autorizado.estado === "sesion_requerida" ? autorizado : autorizado.valor
  }

  return {
    consultar,
    crear: (encabezados: Headers, entrada: unknown) => guardar(encabezados, entrada),
    editar: (encabezados: Headers, referencia: unknown, entrada: unknown) => guardar(encabezados, entrada, referencia ?? null),
  }
}
