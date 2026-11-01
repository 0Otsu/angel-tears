import { revalidatePath } from "next/cache"
import { obtenerDb } from "@/lib/infraestructura/db"
import { exigirAdministradora } from "@/lib/modulos/autenticacion/exigir-administradora"
import { crearAlmacenCloudinary } from "@/lib/modulos/productos/imagen-cloudinary"
import { crearManejadorImagenProducto } from "@/lib/modulos/productos/imagen-http"
import { crearCargaImagenProducto, crearReemplazoImagenProducto } from "@/lib/modulos/productos/imagen-servicio"

export const runtime = "nodejs"
const crearManejador = (reemplazo: boolean) => crearManejadorImagenProducto({
  exigir: exigirAdministradora, origen: () => process.env.BETTER_AUTH_URL,
  adjuntar: (encabezados, referencia, contenido) => (reemplazo ? crearReemplazoImagenProducto : crearCargaImagenProducto)({ db: obtenerDb(), exigir: exigirAdministradora, almacen: crearAlmacenCloudinary() })(encabezados, referencia, contenido),
  alGuardar: () => {
    for (const ruta of ["/admin/productos", "/", "/catalogo", "/sitemap.xml"]) revalidatePath(ruta)
    revalidatePath("/catalogo/[slug]", "page")
  },
})
const atender = crearManejador(false)
const reemplazar = crearManejador(true)

export async function POST(request: Request, contexto: { params: Promise<{ id: string }> }) {
  return atender(request, (await contexto.params).id)
}

export async function PUT(request: Request, contexto: { params: Promise<{ id: string }> }) {
  return reemplazar(request, (await contexto.params).id)
}
