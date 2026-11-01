import { revalidatePath } from "next/cache"
import { obtenerDb } from "@/lib/infraestructura/db"
import { exigirAdministradora } from "@/lib/modulos/autenticacion/exigir-administradora"
import { crearAlmacenCloudinary } from "@/lib/modulos/productos/imagen-cloudinary"
import { crearManejadorImagenProducto } from "@/lib/modulos/productos/imagen-http"
import { crearCargaImagenProducto } from "@/lib/modulos/productos/imagen-servicio"

export const runtime = "nodejs"
const atender = crearManejadorImagenProducto({
  exigir: exigirAdministradora, origen: () => process.env.BETTER_AUTH_URL,
  adjuntar: (encabezados, referencia, contenido) => crearCargaImagenProducto({ db: obtenerDb(), exigir: exigirAdministradora, almacen: crearAlmacenCloudinary() })(encabezados, referencia, contenido),
  alGuardar: () => revalidatePath("/admin/productos"),
})

export async function POST(request: Request, contexto: { params: Promise<{ id: string }> }) {
  return atender(request, (await contexto.params).id)
}
