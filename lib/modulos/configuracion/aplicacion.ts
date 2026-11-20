import "server-only"
import { cache } from "react"
import { obtenerDb } from "@/lib/infraestructura/db"
import { proyectarNegocioPublico } from "@/lib/negocio-publico"
import { leerConfiguracionNegocio } from "./persistencia"

export const obtenerNegocioPublico = cache(async () => {
  try {
    return proyectarNegocioPublico(await leerConfiguracionNegocio(obtenerDb()))
  } catch {
    console.error("[configuracion] información pública no disponible")
    return undefined
  }
})
