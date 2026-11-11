"use server"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { obtenerAdministracionEgresos } from "@/lib/modulos/egresos/administracion-aplicacion"
import type { ResultadoRegistro, ResultadoAnulacion, ResultadoDetalle } from "@/lib/modulos/egresos/contrato"

function registrarError(error: unknown) {
  console.error("[egresos] fallo de operacion", { tipo: error instanceof Error ? error.name : typeof error })
}
export async function registrarEgresoAccion(entrada: unknown): Promise<ResultadoRegistro> {
  try {
    const r = await obtenerAdministracionEgresos().registrar(await headers(), entrada)
    if (r.estado === "ok") revalidatePath("/admin/egresos")
    return r
  } catch (e) { registrarError(e); return { estado: "error_tecnico" } }
}
export async function anularEgresoAccion(id: unknown): Promise<ResultadoAnulacion> {
  try {
    const r = await obtenerAdministracionEgresos().anular(await headers(), id)
    if (r.estado === "ok" || r.estado === "ya_anulado") revalidatePath("/admin/egresos")
    return r
  } catch (e) { registrarError(e); return { estado: "error_tecnico" } }
}
export async function detalleEgresoAccion(id: unknown): Promise<ResultadoDetalle> {
  try { return await obtenerAdministracionEgresos().detalle(await headers(), id) }
  catch (e) { registrarError(e); return { estado: "error_tecnico" } }
}
