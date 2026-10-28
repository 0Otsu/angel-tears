"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { obtenerAdministracionProductos } from "@/lib/modulos/productos/administracion-aplicacion"
import type { ResultadoGuardarProducto } from "@/lib/modulos/productos/administracion-contrato"

function datosDe(formulario: FormData) {
  return Object.fromEntries(["nombre", "precio", "categoriaCodigo", "descripcion", "material", "medida", "color", "cuidados"]
    .map((campo) => [campo, formulario.get(campo)]))
}

async function guardar(formulario: FormData, edicion: boolean): Promise<ResultadoGuardarProducto> {
  try {
    const administracion = obtenerAdministracionProductos()
    const encabezados = await headers()
    const resultado = edicion
      ? await administracion.editar(encabezados, { id: formulario.get("id"), version: formulario.get("version") }, datosDe(formulario))
      : await administracion.crear(encabezados, datosDe(formulario))
    if (resultado.estado === "ok") revalidatePath("/admin/productos")
    return resultado
  } catch (error) {
    console.error("[productos] fallo al guardar", { tipo: error instanceof Error ? error.name : typeof error })
    return { estado: "error_tecnico" }
  }
}

export async function crearProductoAccion(formulario: FormData): Promise<ResultadoGuardarProducto> {
  return guardar(formulario, false)
}

export async function editarProductoAccion(formulario: FormData): Promise<ResultadoGuardarProducto> {
  return guardar(formulario, true)
}
