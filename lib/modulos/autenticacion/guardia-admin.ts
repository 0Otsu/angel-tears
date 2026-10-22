import "server-only"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import {
  esErrorSesionRequerida,
  type IdentidadAdministradora,
} from "@/lib/modulos/autenticacion/contrato"
import { exigirAdministradora } from "@/lib/modulos/autenticacion/exigir-administradora"

// Guardias para paginas y layouts del admin (tarea 2.4). Verifican la sesion EN EL SERVIDOR, en
// cada render: un layout no se vuelve a ejecutar al navegar entre paginas, asi que toda
// `page.tsx` bajo app/admin/(panel)/ debe llamar a `exigirAdministradoraEnPagina` (una prueba
// lo verifica). Ocultar enlaces o esconder el panel con CSS no es seguridad.

/** Devuelve la identidad o redirige a /admin/login sin entregar ningun dato privado. */
export async function exigirAdministradoraEnPagina(): Promise<IdentidadAdministradora> {
  let administradora: IdentidadAdministradora | null = null
  try {
    administradora = await exigirAdministradora(await headers())
  } catch (error) {
    if (!esErrorSesionRequerida(error)) throw error
  }
  // `redirect` lanza una excepcion interna de Next: se llama fuera del try.
  if (!administradora) redirect("/admin/login")
  return administradora
}

/** Para /admin/login: si ya hay una sesion valida, lleva al panel sin pedir las credenciales. */
export async function redirigirAlPanelSiHaySesion(): Promise<void> {
  let haySesion = false
  try {
    await exigirAdministradora(await headers())
    haySesion = true
  } catch (error) {
    if (!esErrorSesionRequerida(error)) throw error
  }
  if (haySesion) redirect("/admin")
}
