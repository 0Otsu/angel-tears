import { eq, sql } from "drizzle-orm"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import { user } from "../../lib/infraestructura/esquemas/auth"
import { producto } from "../../lib/infraestructura/esquemas/producto"
import { proveedor } from "../../lib/infraestructura/esquemas/proveedor"
import { insertarProductoOcultoConSaldo, leerProductosInternos, sembrarCategorias } from "../../lib/modulos/productos/persistencia"
import { crearContratoInventario } from "../../lib/modulos/inventario/persistencia"
import { registrarAjuste } from "../../lib/modulos/inventario/ajustes"
import { registrarCompra } from "../../lib/modulos/compras/registro"
import { anularCompra } from "../../lib/modulos/compras/anulacion"
import { registrarVenta } from "../../lib/modulos/ventas/registro"
import { anularVenta } from "../../lib/modulos/ventas/anulacion"
import { crearAdministracionEgresos } from "../../lib/modulos/egresos/administracion"
import { crearPublicacionProductos } from "../../lib/modulos/productos/publicacion"
import { esquemaProveedor } from "../../lib/modulos/proveedores/validacion"
import type { ReferenciaImagen } from "../../lib/modulos/productos/imagen-contrato"
import { crearPlanDemo, idDemo, PRODUCTOS_DEMO, PROVEEDORES_DEMO } from "./plan"
import { EMAIL_DEMO, ErrorDemo } from "./seguridad"

type Tx = Parameters<Parameters<NodePgDatabase["transaction"]>[0]>[0]
const tablasDemo = "movimiento_stock, ajuste_stock, inventario, producto_media, venta_linea, compra_linea, venta, compra, egreso, producto, proveedor"

function exigirOk<T extends { estado: string }>(resultado: T): T & { estado: "ok" } {
  if (resultado.estado !== "ok" && resultado.estado !== "ya_anulada" && resultado.estado !== "ya_anulado") {
    throw new ErrorDemo("Una operacion de demo fue rechazada; se revierte toda la carga.")
  }
  return resultado as T & { estado: "ok" }
}

/** Rechaza mezclar datos de otra persona, incluso antes de una restauracion explicita. */
export async function verificarPropiedadDemo(tx: Tx) {
  const usuarios = await tx.select({ id: user.id, email: user.email, nombre: user.name }).from(user)
  if (usuarios.length !== 1 || usuarios[0].email !== EMAIL_DEMO) throw new ErrorDemo("Se exige una unica administradora ficticia de demo.")
  const actor = usuarios[0]
  const ids = new Set(PRODUCTOS_DEMO.map(p => p.id)), proveedores = new Set(PROVEEDORES_DEMO.map(p => p.id))
  const existentes = await tx.select({ id: producto.id }).from(producto)
  const prov = await tx.select({ id: proveedor.id }).from(proveedor)
  if (existentes.some(p => !ids.has(p.id)) || prov.some(p => !proveedores.has(p.id))) throw new ErrorDemo("Hay productos o proveedores ajenos al conjunto de demo.")
  // Identificadores SQL constantes; valores del actor parametrizados. No CASCADE ni tablas Auth.
  for (const tabla of ["compra", "venta", "egreso", "ajuste_stock", "movimiento_stock"]) {
    const filas = await tx.execute(sql`SELECT 1 FROM ${sql.identifier(tabla)} WHERE actor_id <> ${actor.id} LIMIT 1`)
    if (filas.rows.length) throw new ErrorDemo("Hay operaciones de otro actor; se rechaza modificar el conjunto.")
  }
  return actor
}

/** El CLI valida primero endpoint y marcador. Toda la carga/reset usa UNA tx y savepoints. */
export async function sembrarDemo(db: NodePgDatabase, imagenes: Record<string, ReferenciaImagen>, restablecer = false) {
  return db.transaction(async tx => {
    await tx.execute(sql`SET LOCAL lock_timeout = '5s'`)
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('angel-tears-demo:20261118:v1'))`)
    // Tambien impide operaciones de UI durante el examen de propiedad y el restablecimiento.
    await tx.execute(sql.raw(`LOCK TABLE ${tablasDemo} IN EXCLUSIVE MODE`))
    const actor = await verificarPropiedadDemo(tx)
    if (restablecer) await tx.execute(sql.raw(`TRUNCATE TABLE ${tablasDemo}`))
    // PgTransaction ofrece las operaciones usadas por los servicios; sus transaction() son
    // savepoints. No abre otro pool ni confirma fuera de la transaccion exterior.
    const bd = tx as unknown as NodePgDatabase
    const inventario = crearContratoInventario(bd)
    const exigir = async () => ({ id: actor.id, nombre: actor.nombre, email: actor.email })
    const publicar = crearPublicacionProductos({ db: bd, exigir })
    const egresos = crearAdministracionEgresos({ db: bd, exigir })
    const headers = new Headers()
    await sembrarCategorias(tx)
    for (const p of PROVEEDORES_DEMO) await tx.insert(proveedor).values({ id: p.id, ...esquemaProveedor.parse(p) }).onConflictDoNothing({ target: proveedor.id })
    for (const p of PRODUCTOS_DEMO) {
      const [previo] = await tx.select({ id: producto.id }).from(producto).where(eq(producto.id, p.id))
      if (previo) continue // Repetir nunca pisa ediciones, precios ni imagenes de la exposicion.
      await insertarProductoOcultoConSaldo(tx, p.id, p, inventario.crearSaldoCero)
      const imagen = imagenes[p.id]
      if (imagen) await tx.update(producto).set({ imagenAssetId: imagen.assetId, imagenPublicId: imagen.publicId,
        imagenVersionProveedor: imagen.versionProveedor, imagenUrlSegura: imagen.urlSegura,
        imagenAncho: imagen.ancho, imagenAlto: imagen.alto, imagenFormato: imagen.formato }).where(eq(producto.id, p.id))
      let version = 1
      if (p.publicar) {
        const r = exigirOk(await publicar(headers, { id: p.id, version, accion: "publicar" }))
        version = r.version
      }
      if (p.destacado) exigirOk(await publicar(headers, { id: p.id, version, accion: "destacar" }))
    }
    for (const p of PRODUCTOS_DEMO.filter(p => p.inicial > 0)) exigirOk(await registrarAjuste(bd, inventario, {
      claveSolicitud: idDemo(`inicial:${p.id}`), productoId: p.id, tipo: "INICIAL", cantidad: p.inicial,
      motivo: "Existencias iniciales del entorno de demostración", actorId: actor.id,
    }))
    const plan = crearPlanDemo()
    const leer = (ids: readonly string[]) => leerProductosInternos(bd, ids)
    // Operaciones en orden de fecha; compras primero cuando comparten dia. Cada anulacion
    // ocurre inmediatamente despues de su registro y usa la reversa del servicio original.
    const eventos = [
      ...plan.compras.map(c => ({ fecha: c.fecha, orden: 0, ejecutar: async () => {
        const r = exigirOk(await registrarCompra(bd, inventario, leer, { claveSolicitud: c.clave, fechaOperacion: c.fecha,
          proveedorId: c.proveedorId, nota: "Reposición de accesorios", lineas: c.lineas, actorId: actor.id }))
        if (c.anulada) exigirOk(await anularCompra(bd, inventario, leer, { compraId: r.compra.id, actorId: actor.id }))
      } })),
      ...plan.ventas.map(v => ({ fecha: v.fecha, orden: 1, ejecutar: async () => {
        const r = exigirOk(await registrarVenta(bd, inventario, leer, { claveSolicitud: v.clave, fechaOperacion: v.fecha,
          comprador: null, lineas: v.lineas, actorId: actor.id }))
        if (v.anulada) exigirOk(await anularVenta(bd, inventario, { ventaId: r.venta.id, actorId: actor.id }))
      } })),
      ...plan.gastos.map(g => ({ fecha: g.fecha, orden: 2, ejecutar: async () => {
        const r = exigirOk(await egresos.registrar(headers, { claveSolicitud: g.clave, fechaOperacion: g.fecha, concepto: g.concepto, importe: g.importe }))
        if (g.anulado) exigirOk(await egresos.anular(headers, r.egreso.id))
      } })),
    ].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.orden - b.orden)
    for (const evento of eventos) await evento.ejecutar()
    // Fuerza los triggers diferidos de galeria antes de retornar; cualquier fallo revierte todo.
    await tx.execute(sql`SET CONSTRAINTS ALL IMMEDIATE`)
    return { productos: 25, proveedores: 4, compras: 25, ventas: 200, gastos: 25 }
  })
}
