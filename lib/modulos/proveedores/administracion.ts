import "server-only"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import { z } from "zod"
import { conAdministradora, type ExigirAdministradora } from "@/lib/modulos/autenticacion/contrato"
import type {
  CampoProveedor,
  ProveedorAdministrativo,
  ResultadoProveedorAdmin,
} from "@/lib/modulos/proveedores/administracion-contrato"
import {
  cambiarActividadProveedor,
  crearProveedor,
  listarProveedores,
  modificarProveedor,
  type ProveedorDto,
  type ResultadoProveedor,
} from "@/lib/modulos/proveedores/servicio"

// Casos de uso administrativos de Proveedores. Cada uno exige la Administradora en el servidor
// antes de cualquier lectura o efecto. No hay baja: la eliminacion de proveedores no esta
// aprobada, solo se inactiva o reactiva (D3).

const referencia = z.object({ id: z.uuid(), version: z.number().int().min(1) })
const CAMPOS: readonly string[] = ["nombre", "telefono", "instagram", "nota"]

function aAdministrativo(fila: ProveedorDto): ProveedorAdministrativo {
  return {
    id: fila.id,
    nombre: fila.nombre,
    telefono: fila.telefono,
    instagram: fila.instagram,
    nota: fila.nota,
    activo: fila.activo,
    version: fila.version,
    actualizadoEn: fila.actualizadoEn.toISOString(),
  }
}

function aResultado(resultado: ResultadoProveedor): ResultadoProveedorAdmin {
  switch (resultado.estado) {
    case "ok":
      return { estado: "ok", proveedor: aAdministrativo(resultado.proveedor) }
    case "conflicto_version":
      return { estado: "conflicto_version", proveedor: aAdministrativo(resultado.proveedor) }
    case "no_encontrado":
      return resultado
    case "datos_invalidos":
      return {
        estado: "datos_invalidos",
        errores: Object.fromEntries(
          resultado.errores.filter((e) => CAMPOS.includes(e.campo)).map((e) => [e.campo as CampoProveedor, e.mensaje]),
        ),
      }
  }
}

export function crearAdministracionProveedores(dependencias: { db: NodePgDatabase; exigir: ExigirAdministradora }) {
  const { db, exigir } = dependencias

  /** Todos los proveedores, activos e inactivos: la administradora ve la historia completa. */
  async function consultar(encabezados: Headers): Promise<ProveedorAdministrativo[]> {
    await exigir(encabezados)
    return (await listarProveedores(db)).map(aAdministrativo)
  }

  async function comando(
    encabezados: Headers,
    ejecutar: () => Promise<ResultadoProveedorAdmin>,
  ): Promise<ResultadoProveedorAdmin> {
    const autorizado = await conAdministradora(exigir, encabezados, ejecutar)
    return autorizado.estado === "sesion_requerida" ? autorizado : autorizado.valor
  }

  return {
    consultar,
    crear: (encabezados: Headers, entrada: unknown) =>
      comando(encabezados, async () => aResultado(await crearProveedor(db, entrada))),
    modificar: (encabezados: Headers, ref: unknown, entrada: unknown) =>
      comando(encabezados, async () => {
        const valida = referencia.safeParse(ref)
        if (!valida.success) return { estado: "no_encontrado" }
        return aResultado(await modificarProveedor(db, valida.data.id, valida.data.version, entrada))
      }),
    cambiarActividad: (encabezados: Headers, ref: unknown, activo: boolean) =>
      comando(encabezados, async () => {
        const valida = referencia.safeParse(ref)
        if (!valida.success) return { estado: "no_encontrado" }
        return aResultado(await cambiarActividadProveedor(db, valida.data.id, valida.data.version, activo))
      }),
  }
}
