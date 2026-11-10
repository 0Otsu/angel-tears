import { eq, inArray, sql } from "drizzle-orm"
import type { ConexionBd } from "@/lib/infraestructura/conexion-bd"
import { compra, compraLinea } from "@/lib/infraestructura/esquemas/compra"
import { ajusteStock, inventario, movimientoStock } from "@/lib/infraestructura/esquemas/inventario"
import { producto } from "@/lib/infraestructura/esquemas/producto"
import { proveedor } from "@/lib/infraestructura/esquemas/proveedor"
import type { LeerProductosParaCompra } from "@/lib/modulos/compras/contrato"
import { crearContratoInventario } from "@/lib/modulos/inventario/persistencia"
import { insertarProductoOcultoConSaldo, sembrarCategorias } from "@/lib/modulos/productos/persistencia"

// Apoyo de las pruebas de integracion de Compras: usuario, productos con saldo cero y limpieza
// acotada a lo que crean (las pruebas de integracion comparten la base de pruebas).

export const ACTOR_COMPRAS = "usuario-prueba-compras"
export const PREFIJO_PROVEEDOR_PRUEBA = "Prueba compras "

export function crearArnesCompras(obtenerConexion: () => ConexionBd, ids: readonly string[]) {
  const db = () => obtenerConexion().db
  const contrato = () => crearContratoInventario(db())

  // El nombre y los datos de Producto se leen de la base, como lo haria su contrato interno.
  const leerProductos: LeerProductosParaCompra = async (productoIds) =>
    productoIds.length === 0
      ? []
      : db().select({ id: producto.id, nombre: producto.nombre }).from(producto).where(inArray(producto.id, [...productoIds]))

  async function limpiar() {
    const lineas = await db().select({ id: compraLinea.id }).from(compraLinea).where(inArray(compraLinea.productoId, [...ids]))
    if (lineas.length > 0) {
      await db().delete(movimientoStock).where(inArray(movimientoStock.compraLineaId, lineas.map((l) => l.id)))
    }
    await db().delete(movimientoStock).where(inArray(movimientoStock.productoId, [...ids]))
    const compras = await db().select({ id: compraLinea.compraId }).from(compraLinea).where(inArray(compraLinea.productoId, [...ids]))
    if (compras.length > 0) {
      await db().delete(compraLinea).where(inArray(compraLinea.compraId, compras.map((c) => c.id)))
      await db().delete(compra).where(inArray(compra.id, compras.map((c) => c.id)))
    }
    // Compras de prueba sin lineas (cabecera huerfana de una prueba de rollback).
    await db().delete(compra).where(eq(compra.actorId, ACTOR_COMPRAS))
    await db().delete(ajusteStock).where(inArray(ajusteStock.productoId, [...ids]))
    await db().delete(inventario).where(inArray(inventario.productoId, [...ids]))
    await db().delete(producto).where(inArray(producto.id, [...ids]))
    await db().execute(sql`DELETE FROM proveedor WHERE nombre LIKE ${`${PREFIJO_PROVEEDOR_PRUEBA}%`}`)
  }

  async function preparar() {
    await db().transaction(sembrarCategorias)
    await db().execute(sql`
      INSERT INTO "user" (id, name, email) VALUES (${ACTOR_COMPRAS}, 'Prueba compras', 'prueba-compras@ejemplo.com')
      ON CONFLICT (id) DO NOTHING`)
  }

  async function quitarUsuario() {
    await db().execute(sql`DELETE FROM "user" WHERE id = ${ACTOR_COMPRAS}`)
  }

  async function crearProducto(id: string, nombre: string) {
    await db().transaction((tx) =>
      insertarProductoOcultoConSaldo(tx, id, { nombre, precio: "10.00", categoriaCodigo: "collares" }, contrato().crearSaldoCero))
  }

  async function saldoDe(id: string): Promise<number> {
    const [fila] = await db().select().from(inventario).where(eq(inventario.productoId, id))
    return fila.cantidad
  }

  // Deja un saldo conocido directamente en SQL, sin pasar por el contrato que se prueba.
  const fijarSaldo = (id: string, cantidad: number) =>
    db().update(inventario).set({ cantidad }).where(eq(inventario.productoId, id))

  async function crearProveedor(nombre: string, activo = true) {
    const [fila] = await db().insert(proveedor).values({ nombre: `${PREFIJO_PROVEEDOR_PRUEBA}${nombre}`, activo }).returning()
    return fila
  }

  return { db, contrato, leerProductos, limpiar, preparar, quitarUsuario, crearProducto, saldoDe, fijarSaldo, crearProveedor }
}
