import { and, asc, eq } from "drizzle-orm"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import { proveedor } from "@/lib/infraestructura/esquemas/proveedor"
import { esquemaProveedor } from "@/lib/modulos/proveedores/validacion"

// Casos de uso de Proveedores (D1..D4, tareas 3.1 y 3.2). Sin sesion ni Next: la Action que los
// llame debe exigir la Administradora antes (exigirAdministradora). Recibe la base por
// parametro para probarse contra PostgreSQL aislado. No existe baja fisica: la baja de
// proveedores sin historial no esta aprobada (pendiente), asi que solo se inactiva.

export type ProveedorDto = {
  readonly id: string
  readonly nombre: string
  readonly telefono: string | null
  readonly instagram: string | null
  readonly nota: string | null
  readonly activo: boolean
  readonly version: number
  readonly creadoEn: Date
  readonly actualizadoEn: Date
}

export type ErrorCampoProveedor = { campo: string; mensaje: string }

export type ResultadoProveedor =
  | { estado: "ok"; proveedor: ProveedorDto }
  | { estado: "datos_invalidos"; errores: ErrorCampoProveedor[] }
  | { estado: "no_encontrado" }
  // La version enviada ya no es la vigente: otra edicion se guardo antes.
  | { estado: "conflicto_version"; proveedor: ProveedorDto }

type Bd = NodePgDatabase

function erroresDe(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  return error.issues.map((problema) => ({
    campo: String(problema.path[0] ?? ""),
    mensaje: problema.message,
  }))
}

export async function crearProveedor(db: Bd, entrada: unknown): Promise<ResultadoProveedor> {
  const validacion = esquemaProveedor.safeParse(entrada)
  if (!validacion.success) {
    return { estado: "datos_invalidos", errores: erroresDe(validacion.error) }
  }
  const [fila] = await db.insert(proveedor).values(validacion.data).returning()
  return { estado: "ok", proveedor: fila }
}

export async function obtenerProveedor(db: Bd, id: string): Promise<ProveedorDto | null> {
  const [fila] = await db.select().from(proveedor).where(eq(proveedor.id, id))
  return fila ?? null
}

/** Orden estable por nombre e ID. `soloActivos` es lo que se ofrece al registrar una compra. */
export async function listarProveedores(
  db: Bd,
  opciones: { soloActivos?: boolean } = {},
): Promise<ProveedorDto[]> {
  const filas = db.select().from(proveedor)
  const consulta = opciones.soloActivos ? filas.where(eq(proveedor.activo, true)) : filas
  return consulta.orderBy(asc(proveedor.nombre), asc(proveedor.id))
}

export async function modificarProveedor(
  db: Bd,
  id: string,
  versionEsperada: number,
  entrada: unknown,
): Promise<ResultadoProveedor> {
  const validacion = esquemaProveedor.safeParse(entrada)
  if (!validacion.success) {
    return { estado: "datos_invalidos", errores: erroresDe(validacion.error) }
  }
  return actualizar(db, id, versionEsperada, validacion.data)
}

/** Inactivar (o reactivar) conserva el proveedor y su historia; no borra nada. */
export async function cambiarActividadProveedor(
  db: Bd,
  id: string,
  versionEsperada: number,
  activo: boolean,
): Promise<ResultadoProveedor> {
  return actualizar(db, id, versionEsperada, { activo })
}

async function actualizar(
  db: Bd,
  id: string,
  versionEsperada: number,
  cambios: Partial<typeof proveedor.$inferInsert>,
): Promise<ResultadoProveedor> {
  // La condicion de version va en el UPDATE: dos ediciones simultaneas no pueden ganar ambas.
  const [fila] = await db
    .update(proveedor)
    .set({ ...cambios, version: versionEsperada + 1, actualizadoEn: new Date() })
    .where(and(eq(proveedor.id, id), eq(proveedor.version, versionEsperada)))
    .returning()
  if (fila) return { estado: "ok", proveedor: fila }

  const actual = await obtenerProveedor(db, id)
  return actual ? { estado: "conflicto_version", proveedor: actual } : { estado: "no_encontrado" }
}
