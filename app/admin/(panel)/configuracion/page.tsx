import type { Metadata } from "next"
import { EncabezadoAdmin } from "@/components/admin/piezas-admin"
import { FormularioConfiguracionNegocio } from "@/components/admin/formulario-configuracion-negocio"
import { obtenerDb } from "@/lib/infraestructura/db"
import { leerConfiguracionNegocio } from "@/lib/modulos/configuracion/persistencia"
import { exigirAdministradoraEnPagina } from "@/lib/modulos/autenticacion/guardia-admin"

export default async function PaginaConfiguracion() {
  await exigirAdministradoraEnPagina()
  let configuracion
  try {
    configuracion = await leerConfiguracionNegocio(obtenerDb())
  } catch {
    console.error("[configuracion] no se pudo leer la configuración administrativa")
  }
  return <>
    <EncabezadoAdmin titulo="Configuración" descripcion="Editá la información que se muestra en el sitio público." simple />
    {configuracion ? <FormularioConfiguracionNegocio inicial={configuracion} /> :
      <p role="alert" className="text-sm text-destructive">No pudimos cargar la configuración. Recargá la página para volver a intentar.</p>}
  </>
}

export const metadata: Metadata = { title: "Configuración" }
