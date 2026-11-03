import "server-only"
import { asc, desc, eq } from "drizzle-orm"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import { z } from "zod"
import { user } from "@/lib/infraestructura/esquemas/auth"
import { ajusteStock, inventario, movimientoStock } from "@/lib/infraestructura/esquemas/inventario"
import { categoria, producto } from "@/lib/infraestructura/esquemas/producto"
import { conAdministradora, type ExigirAdministradora } from "@/lib/modulos/autenticacion/contrato"
import { registrarAjuste } from "@/lib/modulos/inventario/ajustes"
import type {
  MovimientoHistorial,
  ResultadoAjusteAdmin,
  ResultadoConsultaStock,
  ResultadoHistorialAdmin,
  ResultadoMinimoAdmin,
} from "@/lib/modulos/inventario/administracion-contrato"
import type { ContratoInventario } from "@/lib/modulos/inventario/contrato"
import type { TipoAjuste } from "@/lib/modulos/inventario/reglas-ajuste"
import { esMinimoValido, esStockBajo } from "@/lib/modulos/inventario/reglas-stock"

// Casos de uso administrativos de Inventario (2.1, 2.2, 2.3 y 2.5). Cada uno exige la
// Administradora en el servidor antes de cualquier lectura o efecto; la interfaz no sustituye
// esa comprobacion. Toda mutacion de saldo pasa por el contrato (`aplicarMovimientos`).

const LIMITE_HISTORIAL = 50
const uuid = z.uuid()

const MENSAJES_AJUSTE = {
  tipo: "Elegí el tipo de ajuste.",
  cantidad: "Ingresá una cantidad entera mayor a cero.",
  motivo: "Indicá el motivo del ajuste.",
} as const

/** La cantidad llega como texto desde el formulario; cualquier cosa que no sea un entero se rechaza. */
function aCantidad(valor: unknown): unknown {
  if (typeof valor === "string" && /^\d{1,9}$/.test(valor.trim())) return Number(valor.trim())
  return valor
}

/** Vacio significa "sin minimo"; cero es un minimo real. */
function aMinimo(valor: unknown): unknown {
  if (valor === null || valor === undefined) return null
  if (typeof valor === "string") {
    const texto = valor.trim()
    if (texto === "") return null
    return /^\d{1,9}$/.test(texto) ? Number(texto) : Number.NaN
  }
  return valor
}

export function crearAdministracionInventario(dependencias: {
  db: NodePgDatabase
  exigir: ExigirAdministradora
  contrato: ContratoInventario
}) {
  const { db, exigir, contrato } = dependencias

  async function consultar(encabezados: Headers): Promise<ResultadoConsultaStock> {
    await exigir(encabezados)
    const filas = await db
      .select({
        productoId: producto.id,
        nombre: producto.nombre,
        categoriaNombre: categoria.nombre,
        publicado: producto.publicado,
        saldo: inventario.cantidad,
        minimo: inventario.minimo,
      })
      .from(inventario)
      .innerJoin(producto, eq(inventario.productoId, producto.id))
      .innerJoin(categoria, eq(producto.categoriaCodigo, categoria.codigo))
      .orderBy(asc(producto.nombre), asc(producto.id))
    return {
      filas: filas.map((fila) => ({
        ...fila,
        stockBajo: esStockBajo(fila.saldo, fila.minimo),
        sinStock: fila.saldo === 0,
      })),
    }
  }

  async function ajustar(encabezados: Headers, entrada: unknown): Promise<ResultadoAjusteAdmin> {
    const dato = (typeof entrada === "object" && entrada !== null ? entrada : {}) as Record<string, unknown>
    const autorizado = await conAdministradora(exigir, encabezados, async (administradora): Promise<ResultadoAjusteAdmin> => {
      const productoId = uuid.safeParse(dato.productoId)
      const claveSolicitud = uuid.safeParse(dato.claveSolicitud)
      if (!productoId.success || !claveSolicitud.success) {
        return {
          estado: "datos_invalidos",
          errores: {
            ...(productoId.success ? {} : { productoId: "El producto no es válido." }),
            ...(claveSolicitud.success ? {} : { claveSolicitud: "Recargá la página e intentá de nuevo." }),
          },
        }
      }
      const resultado = await registrarAjuste(db, contrato, {
        claveSolicitud: claveSolicitud.data,
        productoId: productoId.data,
        tipo: dato.tipo,
        cantidad: aCantidad(dato.cantidad),
        motivo: dato.motivo,
        actorId: administradora.id,
      })
      switch (resultado.estado) {
        case "ok":
          return { estado: "ok", saldoResultante: resultado.ajuste.saldoResultante, repetido: resultado.repetido }
        case "datos_invalidos":
          return {
            estado: "datos_invalidos",
            errores: Object.fromEntries(resultado.errores.map((e) => [e.campo, MENSAJES_AJUSTE[e.campo]])),
          }
        default:
          return resultado
      }
    })
    return autorizado.estado === "sesion_requerida" ? autorizado : autorizado.valor
  }

  async function cambiarMinimo(
    encabezados: Headers,
    entrada: { productoId: unknown; minimo: unknown },
  ): Promise<ResultadoMinimoAdmin> {
    const autorizado = await conAdministradora(exigir, encabezados, async (): Promise<ResultadoMinimoAdmin> => {
      const productoId = uuid.safeParse(entrada.productoId)
      if (!productoId.success) return { estado: "no_encontrado" }
      const minimo = aMinimo(entrada.minimo)
      if (!esMinimoValido(minimo)) {
        return { estado: "datos_invalidos", errores: { minimo: "Ingresá un entero de cero o más, o dejalo vacío para quitar el mínimo." } }
      }
      // Solo toca el minimo: el saldo cambia unicamente con movimientos registrados.
      const [actualizado] = await db
        .update(inventario)
        .set({ minimo, actualizadoEn: new Date() })
        .where(eq(inventario.productoId, productoId.data))
        .returning({ minimo: inventario.minimo })
      return actualizado ? { estado: "ok", minimo: actualizado.minimo } : { estado: "no_encontrado" }
    })
    return autorizado.estado === "sesion_requerida" ? autorizado : autorizado.valor
  }

  async function historial(encabezados: Headers, productoId: unknown): Promise<ResultadoHistorialAdmin> {
    const autorizado = await conAdministradora(exigir, encabezados, async (): Promise<ResultadoHistorialAdmin> => {
      const id = uuid.safeParse(productoId)
      if (!id.success) return { estado: "no_encontrado" }
      const [existe] = await db.select({ id: inventario.productoId }).from(inventario).where(eq(inventario.productoId, id.data))
      if (!existe) return { estado: "no_encontrado" }
      const filas = await db
        .select({
          id: movimientoStock.id,
          delta: movimientoStock.delta,
          saldoResultante: movimientoStock.saldoResultante,
          tipo: movimientoStock.tipo,
          tipoAjuste: ajusteStock.tipo,
          motivo: ajusteStock.motivo,
          actor: user.name,
          creadoEn: movimientoStock.creadoEn,
        })
        .from(movimientoStock)
        .innerJoin(ajusteStock, eq(movimientoStock.ajusteId, ajusteStock.id))
        .innerJoin(user, eq(movimientoStock.actorId, user.id))
        .where(eq(movimientoStock.productoId, id.data))
        .orderBy(desc(movimientoStock.creadoEn), desc(movimientoStock.id))
        .limit(LIMITE_HISTORIAL)
      const movimientos: MovimientoHistorial[] = filas.map((fila) => ({
        ...fila,
        tipo: fila.tipo as MovimientoHistorial["tipo"],
        tipoAjuste: fila.tipoAjuste as TipoAjuste,
        creadoEn: fila.creadoEn.toISOString(),
      }))
      return { estado: "ok", movimientos }
    })
    return autorizado.estado === "sesion_requerida" ? autorizado : autorizado.valor
  }

  return { consultar, ajustar, cambiarMinimo, historial }
}
