import type { Metadata } from "next"
import { ConfiguracionDemo } from "@/components/admin/configuracion-demo"
import { exigirAdministradoraEnPagina } from "@/lib/modulos/autenticacion/guardia-admin"

export default async function PaginaConfiguracion() {
  await exigirAdministradoraEnPagina()
  return <ConfiguracionDemo />
}

export const metadata: Metadata = { title: "Configuración" }
