import "server-only"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import { z } from "zod"
import { conAdministradora, type ExigirAdministradora } from "@/lib/modulos/autenticacion/contrato"
import type { ContratoInventario } from "@/lib/modulos/inventario/contrato"
import type { ConsultarProductosInternos } from "@/lib/modulos/productos/contrato"
import { anularVenta } from "@/lib/modulos/ventas/anulacion"
import type {
  ErroresRegistroVenta,
  ProductoParaVender,
  ResultadoAnulacionAdmin,
  ResultadoDetalleAdmin,
  ResultadoRegistroAdmin,
} from "@/lib/modulos/ventas/administracion-contrato"
import type { FiltroVentas, ResultadoListadoVentas, ResultadoResumenVentas } from "@/lib/modulos/ventas/contrato"
import { listarVentas, obtenerVenta, resumirVentas } from "@/lib/modulos/ventas/lectura"
import type { ErrorEntradaVenta } from "@/lib/modulos/ventas/reglas-venta"
import { registrarVenta } from "@/lib/modulos/ventas/registro"

// Casos de uso administrativos de Ventas (5.1 y 5.2). Cada uno exige la Administradora en el
// servidor antes de cualquier lectura o efecto; la interfaz no sustituye esa comprobacion. El
// stock solo cambia por el contrato de Inventario y Producto solo se lee por su contrato.

const uuid = z.uuid()

const MENSAJES: Record<ErrorEntradaVenta["codigo"], string> = {
  FECHA_INVALIDA: "Ingresá una fecha válida.",
  COMPRADOR_INVALIDO: "El comprador no es válido.",
  SIN_LINEAS: "Agregá al menos un producto.",
  PRODUCTO_INVALIDO: "Elegí un producto.",
  CANTIDAD_INVALIDA: "Ingresá una cantidad entera mayor a cero.",
}

function aErrores(errores: readonly ErrorEntradaVenta[]): ErroresRegistroVenta {
  const resultado: ErroresRegistroVenta = {}
  const porLinea = new Map<number, { linea: number; productoId?: string; cantidad?: string }>()
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

export type DependenciasAdministracionVentas = {
  db: NodePgDatabase
  exigir: ExigirAdministradora
  contrato: ContratoInventario
  consultarProductos: ConsultarProductosInternos
  /** Saldo actual por producto, con la autorizacion de Inventario. */
  consultarSaldos: (encabezados: Headers) => Promise<readonly { productoId: string; saldo: number; categoriaNombre: string }[]>
}

export function crearAdministracionVentas(dependencias: DependenciasAdministracionVentas) {
  const { db, exigir, contrato, consultarProductos, consultarSaldos } = dependencias

  async function registrar(encabezados: Headers, entrada: unknown): Promise<ResultadoRegistroAdmin> {
    const dato = (typeof entrada === "object" && entrada !== null ? entrada : {}) as Record<string, unknown>
    const autorizado = await conAdministradora(exigir, encabezados, async (administradora): Promise<ResultadoRegistroAdmin> => {
      const claveSolicitud = uuid.safeParse(dato.claveSolicitud)
      if (!claveSolicitud.success) {
        return { estado: "datos_invalidos", errores: { claveSolicitud: "Recargá la página e intentá de nuevo." } }
      }
      const resultado = await registrarVenta(
        db,
        contrato,
        // Producto se lee por su contrato (ocultos incluidos); de aqui salen nombre y precio de la linea.
        async (ids) =>
          (await consultarProductos(encabezados, ids)).map((p) => ({ id: p.id, nombre: p.nombre, precio: p.precio })),
        {
          claveSolicitud: claveSolicitud.data,
          fechaOperacion: dato.fechaOperacion,
          comprador: dato.comprador,
          lineas: dato.lineas,
          actorId: administradora.id,
        },
      )
      switch (resultado.estado) {
        case "ok":
          return { estado: "ok", venta: resultado.venta, repetido: resultado.repetido }
        case "datos_invalidos":
          return { estado: "datos_invalidos", errores: aErrores(resultado.errores) }
        default:
          return resultado
      }
    })
    return autorizado.estado === "sesion_requerida" ? autorizado : autorizado.valor
  }

  async function anular(encabezados: Headers, ventaId: unknown): Promise<ResultadoAnulacionAdmin> {
    const autorizado = await conAdministradora(exigir, encabezados, async (administradora): Promise<ResultadoAnulacionAdmin> => {
      const id = uuid.safeParse(ventaId)
      if (!id.success) return { estado: "no_encontrada" }
      const resultado = await anularVenta(db, contrato, { ventaId: id.data, actorId: administradora.id })
      return resultado.estado === "ok" ? { estado: "ok", venta: resultado.venta } : resultado
    })
    return autorizado.estado === "sesion_requerida" ? autorizado : autorizado.valor
  }

  async function detalle(encabezados: Headers, ventaId: unknown): Promise<ResultadoDetalleAdmin> {
    const autorizado = await conAdministradora(exigir, encabezados, async (): Promise<ResultadoDetalleAdmin> => {
      const id = uuid.safeParse(ventaId)
      return id.success ? obtenerVenta(db, id.data) : { estado: "no_encontrada" }
    })
    return autorizado.estado === "sesion_requerida" ? autorizado : autorizado.valor
  }

  // Lecturas para paginas y Dashboard: sin sesion lanzan ErrorSesionRequerida, como Inventario.
  async function listar(encabezados: Headers, filtro: FiltroVentas = {}): Promise<ResultadoListadoVentas> {
    await exigir(encabezados)
    return db.transaction(tx => listarVentas(tx, filtro), { isolationLevel: "repeatable read", accessMode: "read only" })
  }

  async function resumir(encabezados: Headers, filtro: Pick<FiltroVentas, "desde" | "hasta"> = {}): Promise<ResultadoResumenVentas> {
    await exigir(encabezados)
    return resumirVentas(db, filtro)
  }

  /** Productos internos (ocultos incluidos) con precio vigente y saldo, para el selector de lineas. */
  async function productosParaVender(encabezados: Headers): Promise<ProductoParaVender[]> {
    await exigir(encabezados)
    const saldos = await consultarSaldos(encabezados)
    const productos = await consultarProductos(encabezados, saldos.map((s) => s.productoId))
    const porId = new Map(saldos.map((s) => [s.productoId, s]))
    return productos
      .map((p) => ({
        productoId: p.id,
        nombre: p.nombre,
        categoriaNombre: porId.get(p.id)?.categoriaNombre ?? p.categoriaNombre,
        precio: p.precio,
        saldo: porId.get(p.id)?.saldo ?? 0,
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es") || a.productoId.localeCompare(b.productoId))
  }

  return { registrar, anular, detalle, listar, resumir, productosParaVender }
}
