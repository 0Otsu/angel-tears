import type { Metadata } from "next"
import Link from "next/link"
import { FormularioLogin } from "@/components/admin/formulario-login"
import { MarcoAcceso } from "@/components/admin/marco-acceso"
import { redirigirAlPanelSiHaySesion } from "@/lib/modulos/autenticacion/guardia-admin"

export const metadata: Metadata = {
  title: "Panel de administración",
  robots: { index: false, follow: false },
}

export default async function PaginaLogin() {
  // Con una sesion valida no se vuelven a pedir las credenciales: va directo al panel.
  await redirigirAlPanelSiHaySesion()
  return (
    <MarcoAcceso titulo="Panel de administración" descripcion="Ingresá tus datos para continuar.">
      <FormularioLogin />
      <p className="mt-6 text-sm">
        <Link
          href="/admin/recuperar"
          className="rounded-sm text-muted-foreground underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </p>
    </MarcoAcceso>
  )
}
