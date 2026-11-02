"use server"
import { headers } from "next/headers"
import { obtenerDb } from "@/lib/infraestructura/db"
import { exigirAdministradora } from "@/lib/modulos/autenticacion/exigir-administradora"
import { esErrorSesionRequerida } from "@/lib/modulos/autenticacion/contrato"
import { crearConsultaVistaPrevia } from "@/lib/modulos/productos/vista-previa"
import type { ResultadoVistaPrevia } from "@/lib/modulos/productos/vista-previa-contrato"

export async function consultarVistaPreviaAccion(referencia: unknown): Promise<ResultadoVistaPrevia> {
  try { return await crearConsultaVistaPrevia({ db: obtenerDb(), exigir: exigirAdministradora })(await headers(), referencia) }
  catch (error) {
    if (esErrorSesionRequerida(error)) return { estado: "sesion_requerida" }
    console.error("[productos] fallo de vista previa", { tipo: error instanceof Error ? error.name : typeof error })
    return { estado: "error_tecnico" }
  }
}
