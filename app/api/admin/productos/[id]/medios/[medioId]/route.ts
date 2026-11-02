import { atenderGaleria } from "@/lib/modulos/productos/galeria-aplicacion"
export const runtime = "nodejs"
type Contexto = { params: Promise<{ id: string; medioId: string }> }
async function atender(r: Request, c: Contexto) { const p = await c.params; return atenderGaleria(r, p.id, p.medioId) }
export const PUT = atender
export const PATCH = atender
export const DELETE = atender
