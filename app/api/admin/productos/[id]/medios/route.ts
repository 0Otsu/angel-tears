import { atenderGaleria } from "@/lib/modulos/productos/galeria-aplicacion"
export const runtime = "nodejs"
type Contexto = { params: Promise<{ id: string }> }
export async function GET(r: Request, c: Contexto) { return atenderGaleria(r, (await c.params).id) }
export async function POST(r: Request, c: Contexto) { return atenderGaleria(r, (await c.params).id) }
