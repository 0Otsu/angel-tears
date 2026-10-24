import type { Metadata } from "next"
import { FormularioRestablecer } from "@/components/admin/formulario-restablecer"
import { MarcoAcceso } from "@/components/admin/marco-acceso"

// El enlace del correo lleva el token en la URL (?token=...), asi que la pagina no se indexa y no
// manda el Referer a ningun sitio: el token no puede filtrarse por enlaces ni recursos externos.
export const metadata: Metadata = {
  title: "Elegir contraseña nueva",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
}

// Better Auth redirige aca con ?token=... si el enlace era valido, o con ?error=INVALID_TOKEN si no.
export default async function PaginaRestablecer({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[]; error?: string | string[] }>
}) {
  const { token, error } = await searchParams
  const tokenUnico = typeof token === "string" && token.length > 0 ? token : undefined
  return (
    <MarcoAcceso titulo="Elegir contraseña nueva" descripcion="Elegí una contraseña nueva para ingresar al panel.">
      <FormularioRestablecer token={tokenUnico} enlaceInvalido={Boolean(error)} />
    </MarcoAcceso>
  )
}
