import "server-only"
import { obtenerDb } from "@/lib/infraestructura/db"
import { exigirAdministradora } from "@/lib/modulos/autenticacion/exigir-administradora"
import { obtenerAdministracionInventario } from "@/lib/modulos/inventario/administracion-aplicacion"
import { crearContratoInventario } from "@/lib/modulos/inventario/persistencia"
import { consultarProductosInternos } from "@/lib/modulos/productos/consultar-productos-internos"
import { crearAdministracionVentas } from "./administracion"

// Composicion real de Ventas: base, sesion de Auth, contrato de Inventario y contrato interno de
// Producto. Los saldos se leen por la administracion de Inventario, que ya valida la sesion.
export function obtenerAdministracionVentas() {
  const db = obtenerDb()
  return crearAdministracionVentas({
    db,
    exigir: exigirAdministradora,
    contrato: crearContratoInventario(db),
    consultarProductos: consultarProductosInternos,
    consultarSaldos: async (encabezados) =>
      (await obtenerAdministracionInventario().consultar(encabezados)).filas.map((f) => ({
        productoId: f.productoId,
        saldo: f.saldo,
        categoriaNombre: f.categoriaNombre,
      })),
  })
}
