import "server-only"
import { revalidatePath } from "next/cache"
import { obtenerDb } from "@/lib/infraestructura/db"
import { exigirAdministradora } from "@/lib/modulos/autenticacion/exigir-administradora"
import { crearAlmacenCloudinary } from "./imagen-cloudinary"
import { crearManejadorGaleria } from "./galeria-http"
export function atenderGaleria(request: Request, id: string, medioId?: string) {
  return crearManejadorGaleria({ db: obtenerDb(), exigir: exigirAdministradora, almacen: crearAlmacenCloudinary(), origen: () => process.env.BETTER_AUTH_URL,
    alGuardar: () => { for (const ruta of ["/admin/productos", "/", "/catalogo", "/sitemap.xml"]) revalidatePath(ruta); revalidatePath("/catalogo/[slug]", "page") },
  })(request, id, medioId)
}
