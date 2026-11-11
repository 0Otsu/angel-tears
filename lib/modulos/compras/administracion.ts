import "server-only"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import { z } from "zod"
import { conAdministradora, type ExigirAdministradora } from "@/lib/modulos/autenticacion/contrato"
import { anularCompra } from "@/lib/modulos/compras/anulacion"
import type {
  ErroresRegistroCompra,
  ProductoParaComprar,
  ProveedorParaComprar,
  ResultadoAnulacionAdmin,
  ResultadoDetalleAdmin,
  ResultadoRegistroAdmin,
} from "@/lib/modulos/compras/administracion-contrato"
import type {
  FiltroCompras,
  LeerProductosParaCompra,
  ResultadoListadoCompras,
  ResultadoResumenCompras,
} from "@/lib/modulos/compras/contrato"
import { listarCompras, obtenerCompra, resumirCompras } from "@/lib/modulos/compras/lectura"
import type { ErrorEntradaCompra } from "@/lib/modulos/compras/reglas-compra"
import { registrarCompra } from "@/lib/modulos/compras/registro"
import type { ContratoInventario } from "@/lib/modulos/inventario/contrato"
import { listarProveedores } from "@/lib/modulos/proveedores/servicio"

// Casos de uso administrativos de Compras (4.1 a 4.5). Cada uno exige la Administradora en el
// servidor antes de cualquier lectura o efecto; la interfaz no sustituye esa comprobacion. El
// stock solo cambia por el contrato de Inventario y Producto solo se lee por su contrato.

const uuid = z.uuid()

const MENSAJES: Record<ErrorEntradaCompra["codigo"], string> = {
  FECHA_INVALIDA: "Ingresá una fecha válida.",
  PROVEEDOR_INVALIDO: "El proveedor no es válido.",
  NOTA_INVALIDA: "La nota no es válida.",
  SIN_LINEAS: "Agregá al menos un producto.",
  PRODUCTO_INVALIDO: "Elegí un producto.",
  CANTIDAD_INVALIDA: "Ingresá una cantidad entera mayor a cero.",
  IMPORTE_INVALIDO: "Ingresá un costo válido, con hasta dos decimales.",
}

function aErrores(errores: readonly ErrorEntradaCompra[]): ErroresRegistroCompra {
  const resultado: ErroresRegistroCompra = {}
  const porLinea = new Map<number, { linea: number; productoId?: string; cantidad?: string; costoUnitario?: string }>()
  for (const error of errores) {
    if ("linea" in error) {
      const actual = porLinea.get(error.linea) ?? { linea: error.linea }
      actual[error.campo] = MENSAJES[error.codigo]
      porLinea.set(error.linea, actual)
    } else {
      resultado[error.campo] = MENSAJES[error.codigo]
    }
  }
  return porLinea.size > 0 ? { ...resultado, porLinea: [...porLinea.values()] } : resultado
}

export type DependenciasAdministracionCompras = {
  db: NodePgDatabase
  exigir: ExigirAdministradora
  contrato: ContratoInventario
  consultarProductos: (encabezados: Headers, ids: readonly string[]) => Promise<readonly { id: string; nombre: string; categoriaNombre: string }[]>
  /** Saldo actual por producto, con la autorizacion de Inventario. */
  consultarSaldos: (encabezados: Headers) => Promise<readonly { productoId: string; saldo: number }[]>
}

export function crearAdministracionCompras(dependencias: DependenciasAdministracionCompras) {
  const { db, exigir, contrato, consultarProductos, consultarSaldos } = dependencias

  const leerProductos = (encabezados: Headers): LeerProductosParaCompra => async (ids) =>
    (await consultarProductos(encabezados, ids)).map((p) => ({ id: p.id, nombre: p.nombre }))

  async function registrar(encabezados: Headers, entrada: unknown): Promise<ResultadoRegistroAdmin> {
    const dato = (typeof entrada === "object" && entrada !== null ? entrada : {}) as Record<string, unknown>
    const autorizado = await conAdministradora(exigir, encabezados, async (administradora): Promise<ResultadoRegistroAdmin> => {
      const claveSolicitud = uuid.safeParse(dato.claveSolicitud)
      if (!claveSolicitud.success) {
        return { estado: "datos_invalidos", errores: { claveSolicitud: "Recargá la página e intentá de nuevo." } }
      }
      const resultado = await registrarCompra(db, contrato, leerProductos(encabezados), {
        claveSolicitud: claveSolicitud.data,
        fechaOperacion: dato.fechaOperacion,
        proveedorId: dato.proveedorId,
        nota: dato.nota,
        lineas: dato.lineas,
        actorId: administradora.id,
      })
      switch (resultado.estado) {
        case "ok":
          return { estado: "ok", compra: resultado.compra, repetido: resultado.repetido }
        case "datos_invalidos":
          return { estado: "datos_invalidos", errores: aErrores(resultado.errores) }
        default:
          return resultado
      }
    })
    return autorizado.estado === "sesion_requerida" ? autorizado : autorizado.valor
  }

  async function anular(encabezados: Headers, compraId: unknown): Promise<ResultadoAnulacionAdmin> {
    const autorizado = await conAdministradora(exigir, encabezados, async (administradora): Promise<ResultadoAnulacionAdmin> => {
      const id = uuid.safeParse(compraId)
      if (!id.success) return { estado: "no_encontrada" }
      const resultado = await anularCompra(db, contrato, leerProductos(encabezados), { compraId: id.data, actorId: administradora.id })
      return resultado.estado === "ok" ? { estado: "ok", compra: resultado.compra } : resultado
    })
    return autorizado.estado === "sesion_requerida" ? autorizado : autorizado.valor
  }

  async function detalle(encabezados: Headers, compraId: unknown): Promise<ResultadoDetalleAdmin> {
    const autorizado = await conAdministradora(exigir, encabezados, async (): Promise<ResultadoDetalleAdmin> => {
      const id = uuid.safeParse(compraId)
      return id.success ? obtenerCompra(db, id.data) : { estado: "no_encontrada" }
    })
    return autorizado.estado === "sesion_requerida" ? autorizado : autorizado.valor
  }

  // Lecturas para paginas y Dashboard: sin sesion lanzan ErrorSesionRequerida, como Inventario.
  async function listar(encabezados: Headers, filtro: FiltroCompras = {}): Promise<ResultadoListadoCompras> {
    await exigir(encabezados)
    return listarCompras(db, filtro)
  }

  async function resumir(encabezados: Headers, filtro: Pick<FiltroCompras, "desde" | "hasta"> = {}): Promise<ResultadoResumenCompras> {
    await exigir(encabezados)
    return resumirCompras(db, filtro)
  }

  /** Productos internos (ocultos incluidos) con su stock actual, para el selector de lineas. */
  async function productosParaComprar(encabezados: Headers): Promise<ProductoParaComprar[]> {
    await exigir(encabezados)
    const saldos = await consultarSaldos(encabezados)
    const productos = await consultarProductos(encabezados, saldos.map((s) => s.productoId))
    const porId = new Map(saldos.map((s) => [s.productoId, s.saldo]))
    return productos
      .map((p) => ({ productoId: p.id, nombre: p.nombre, categoriaNombre: p.categoriaNombre, saldo: porId.get(p.id) ?? 0 }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es") || a.productoId.localeCompare(b.productoId))
  }

  /** Solo proveedores activos: uno inactivo no se ofrece en compras nuevas. */
  async function proveedoresParaComprar(encabezados: Headers): Promise<ProveedorParaComprar[]> {
    await exigir(encabezados)
    return (await listarProveedores(db, { soloActivos: true })).map((p) => ({ id: p.id, nombre: p.nombre }))
  }

  return { registrar, anular, detalle, listar, resumir, productosParaComprar, proveedoresParaComprar }
}
