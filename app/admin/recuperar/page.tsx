import type { Metadata } from "next"
import { FormularioRecuperar } from "@/components/admin/formulario-recuperar"
import { MarcoAcceso } from "@/components/admin/marco-acceso"
import { redirigirAlPanelSiHaySesion } from "@/lib/modulos/autenticacion/guardia-admin"

export const metadata: Metadata = {
  title: "Recuperar contraseña",
  robots: { index: false, follow: false },
}

export default async function PaginaRecuperar() {
  // Con una sesion abierta la contrasena se cambia desde /admin/cuenta, no por correo.
  await redirigirAlPanelSiHaySesion()
  return (
    <MarcoAcceso
      titulo="Recuperar contraseña"
      descripcion="Ingresá el correo de tu cuenta y te enviamos un enlace para elegir una contraseña nueva."
    >
      <FormularioRecuperar />
    </MarcoAcceso>
  )
}
