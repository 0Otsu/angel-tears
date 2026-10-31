"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { obtenerDb } from "@/lib/infraestructura/db"
import { exigirAdministradora } from "@/lib/modulos/autenticacion/exigir-administradora"
import { crearPublicacionProductos, type ResultadoPublicacion } from "@/lib/modulos/productos/publicacion"

// Sin UI anticipada de 2.5. Action con la proteccion de origen nativa de Next y guard real.
export async function cambiarPublicacionAccion(entrada: unknown): Promise<ResultadoPublicacion> {
  try {
    const resultado = await crearPublicacionProductos({ db: obtenerDb(), exigir: exigirAdministradora })(await headers(), entrada)
    if (resultado.estado === "ok") {
      for (const ruta of ["/admin/productos", "/", "/catalogo", `/catalogo/${resultado.slug}`, "/sitemap.xml"]) revalidatePath(ruta)
    }
    return resultado
  } catch (error) {
    console.error("[productos] fallo de publicacion", { tipo: error instanceof Error ? error.name : typeof error })
    return { estado: "error_tecnico" }
  }
}
