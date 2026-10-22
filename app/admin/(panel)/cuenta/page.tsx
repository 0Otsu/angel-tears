import type { Metadata } from "next"
import { CuentaAdmin } from "@/components/admin/cuenta-admin"
import { exigirAdministradoraEnPagina } from "@/lib/modulos/autenticacion/guardia-admin"

export default async function PaginaCuenta() {
  const administradora = await exigirAdministradoraEnPagina()
  return <CuentaAdmin nombre={administradora.nombre} email={administradora.email} />
}

export const metadata: Metadata = { title: "Cuenta" }
