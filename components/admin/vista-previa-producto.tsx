"use client"
import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { ExternalLink } from "lucide-react"
import { consultarVistaPreviaAccion } from "@/app/admin/(panel)/productos/vista-previa-acciones"
import type { ResultadoVistaPrevia } from "@/lib/modulos/productos/vista-previa-contrato"
import { VistaDetalleProducto } from "@/components/publico/vista-detalle-producto"
import { Button } from "@/components/ui/button"
import { CargandoAdmin } from "./cargando-admin"
import { PanelAdmin } from "./piezas-admin"

export function VistaPreviaProducto({ productoId, version, publicado, slug, editarDatos, gestionarImagenes, acciones }: {
  productoId: string; version: number; publicado: boolean; slug: string;
  editarDatos: () => void; gestionarImagenes: () => void; acciones: (listo: boolean, disponible?: boolean) => ReactNode;
}) {
  const [resultado, recibir] = useState<ResultadoVistaPrevia | null>(null)
  const [intento, reintentar] = useState(0)
  useEffect(() => {
    let activa = true
    consultarVistaPreviaAccion({ id: productoId, version }).then(r => { if (activa) recibir(r) }).catch(() => { if (activa) recibir({ estado: "error_tecnico" }) })
    return () => { activa = false }
  }, [productoId, version, intento])
  const listo = resultado?.estado === "ok" && resultado.version === version
  const esperando = resultado === null || resultado.estado === "ok" && !listo
  const conflicto = resultado?.estado === "conflicto_version" || resultado?.estado === "no_encontrado"
  return <section aria-label="Vista previa del producto" className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-lg font-medium">Vista previa</h2><p className="mt-1 text-xs text-muted-foreground">{publicado ? "Publicado" : "Solo visible para vos · Oculto"}</p></div>
      <div className="flex flex-wrap gap-2"><Button className="min-h-11" variant="outline" onClick={editarDatos}>Editar datos</Button><Button className="min-h-11" variant="outline" onClick={gestionarImagenes}>Gestionar imágenes</Button>
        {publicado && <a href={`/catalogo/${slug}`} target="_blank" rel="noopener noreferrer" aria-label="Ver producto (abre otra pestaña)" className="inline-flex min-h-11 items-center gap-2 rounded-md border px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-primary">Ver producto<ExternalLink className="size-4" aria-hidden="true" /></a>}
      </div>
    </div>
    <PanelAdmin className="p-4 sm:p-6">
      {esperando ? <CargandoAdmin tipo="preview" nombre="vista previa"/> : listo ? <div className="mx-auto max-w-7xl"><VistaDetalleProducto product={resultado.producto} nivelTitulo="h2" enlacesEnOtraPestana sizesImagen="(min-width: 1634px) 600px, (min-width: 1314px) calc((100vw - 434px) / 2), (min-width: 1024px) calc(100vw - 354px), (min-width: 640px) calc(100vw - 82px), calc(100vw - 66px)" /></div> : <div className="space-y-3">
        <p role="alert">{conflicto ? "El producto cambió desde que lo abriste." : resultado?.estado === "sesion_requerida" ? "Tu sesión venció. Volvé a iniciar sesión." : "No pudimos preparar la vista previa."}</p>
        {conflicto ? <Button variant="outline" onClick={() => window.location.reload()}>Recargar datos</Button> : resultado?.estado === "sesion_requerida" ? <Link href="/admin/login" className="underline">Iniciar sesión</Link> : <Button variant="outline" onClick={() => { recibir(null); reintentar(n => n + 1) }}>Reintentar consulta</Button>}
      </div>}
    </PanelAdmin>
    {acciones(listo, listo ? resultado.producto.disponible : undefined)}
  </section>
}
