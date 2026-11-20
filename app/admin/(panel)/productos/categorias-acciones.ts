"use server"

import { headers } from "next/headers"
import { obtenerDb } from "@/lib/infraestructura/db"
import { exigirAdministradora } from "@/lib/modulos/autenticacion/exigir-administradora"
import { crearCategoria } from "@/lib/modulos/productos/alta-categoria"
import type { ResultadoAltaCategoria } from "@/lib/modulos/productos/administracion-contrato"

export async function crearCategoriaAccion(nombre: unknown): Promise<ResultadoAltaCategoria> {
  try {
    return await crearCategoria(obtenerDb(), exigirAdministradora, await headers(), nombre)
  } catch {
    console.error("[productos] no se pudo crear la categoría")
    return { estado: "error_tecnico" }
  }
}
