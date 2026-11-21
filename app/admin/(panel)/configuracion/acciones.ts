"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { obtenerDb } from "@/lib/infraestructura/db"
import { exigirAdministradora } from "@/lib/modulos/autenticacion/exigir-administradora"
import { editarConfiguracionNegocio } from "@/lib/modulos/configuracion/administracion"
import type { ConfiguracionNegocio, ResultadoConfiguracion } from "@/lib/modulos/configuracion/contrato"

const campos: (keyof Omit<ConfiguracionNegocio, "horarios">)[] = [
  "direccion", "localidad", "provincia", "referencia",
  "comoLlegar", "telefonoWhatsApp", "usuarioInstagram",
]

function leerHorarios(valor: FormDataEntryValue | null): unknown {
  if (typeof valor !== "string" || valor.length > 4096) return null
  try { return JSON.parse(valor) } catch { return null }
}

export async function guardarConfiguracionAccion(
  _anterior: ResultadoConfiguracion | null, formulario: FormData,
): Promise<ResultadoConfiguracion> {
  try {
    const entrada = {
      ...Object.fromEntries(campos.map((campo) => [campo, formulario.get(campo)])),
      horarios: leerHorarios(formulario.get("horarios")),
    }
    const resultado = await editarConfiguracionNegocio(obtenerDb(), exigirAdministradora, await headers(), entrada)
    if (resultado.estado === "ok") {
      for (const ruta of ["/", "/catalogo", "/admin/configuracion"]) revalidatePath(ruta)
      revalidatePath("/catalogo/[slug]", "page")
    }
    return resultado
  } catch {
    console.error("[configuracion] no se pudo guardar la información comercial")
    return { estado: "error_tecnico" }
  }
}
