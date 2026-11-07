"use client"
import { startTransition, useRef, useState, useTransition, type ReactNode } from "react"
import Link from "next/link"
import { Check, ExternalLink, MoreVertical, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { cambiarPublicacionAccion } from "@/app/admin/(panel)/productos/publicacion-acciones"
import type { ProductoAdministrativo } from "@/lib/modulos/productos/administracion-contrato"
import type { ResultadoPublicacion } from "@/lib/modulos/productos/publicacion"
import { Spinner } from "@/components/ui/spinner"
import { PendingButton } from "@/components/ui/pending-button"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AvisoProductoGuardado } from "./aviso-producto-guardado"
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog"

type Accion = "publicar" | "ocultar" | "destacar" | "quitar_destacado"
const etiquetas = { publicar: "Publicando…", ocultar: "Ocultando…", destacar: "Destacando…", quitar_destacado: "Quitando destacado…" }
export function AccionesProducto({ producto, alGuardar, alNotificar, finalizar = false, disabled = false, enVistaPrevia = false, editarVisible = false, disponible, alEditar, alImagen, accionCancelar }: { producto: ProductoAdministrativo; alGuardar?: (producto: ProductoAdministrativo) => void; alNotificar?: (texto: string) => void; finalizar?: boolean; disabled?: boolean; enVistaPrevia?: boolean; editarVisible?: boolean; disponible?: boolean; alEditar?: () => void; alImagen?: () => void; accionCancelar?: (pendiente: boolean) => ReactNode }) {
  const [operacion, setOperacion] = useState<Accion | null>(null)
  const ejecutando = useRef(false)
  const [navegando, navegar] = useTransition()
  const [error, setError] = useState<Exclude<ResultadoPublicacion["estado"], "ok"> | null>(null)
  const [aviso, notificar] = useState<{ texto: string; numero: number } | null>(null)
  const [confirmacion, confirmar] = useState<{ nombre: string; slug: string } | null>(null)
  const botonAccion = useRef<HTMLButtonElement>(null)
  const grupoAcciones = useRef<HTMLDivElement>(null)
  const volver = useRef<HTMLButtonElement>(null)
  const router = useRouter()
  const [local, setLocal] = useState<ProductoAdministrativo | null>(null)
  const actual = local && local.version >= producto.version ? local : producto
  const pendiente = operacion !== null || navegando
  const ultimaAccion = useRef<Accion | null>(null)
  async function ejecutar(accion: Accion) {
    if (ejecutando.current || navegando || disabled) return
    ejecutando.current = true; ultimaAccion.current = accion
    setOperacion(accion); setError(null)
    try {
      const r = await cambiarPublicacionAccion({ id: actual.id, version: actual.version, accion })
      if (r.estado !== "ok") { setError(r.estado); return }
      const siguiente = { ...actual, version: r.version, ...(accion === "publicar" || accion === "ocultar" ? { publicado: accion === "publicar" } : { destacado: accion === "destacar" }) }
      setLocal(siguiente)
      // Al salir no se inicia otra consulta de preview: competiria con la navegacion.
      if (!(finalizar && accion === "ocultar")) alGuardar?.(siguiente)
      const texto = { publicar: "Producto publicado.", ocultar: "Producto ocultado.", destacar: "Producto destacado.", quitar_destacado: "Se quitó de destacados." }[accion]
      if (enVistaPrevia && accion === "publicar" && !actual.publicado) {
        notificar(null)
        confirmar({ nombre: actual.nombre, slug: r.slug })
      } else if (alNotificar) alNotificar(texto)
      else notificar(prev => ({ texto, numero: (prev?.numero ?? 0) + 1 }))
      if (finalizar && accion === "ocultar") navegar(() => router.push(`/admin/productos?cancelado=${encodeURIComponent(actual.id)}`))
      // El comando termina con su respuesta. La revalidacion no mantiene la fila ocupada.
      else startTransition(() => router.refresh())
    } catch { setError("error_tecnico") }
    finally { ejecutando.current = false; setOperacion(null) }
  }
  const conflicto = error === "conflicto_version" || error === "no_encontrado"
  const mensaje = error === "imagen_requerida" ? "Agregá una imagen antes de publicar." : error === "sesion_requerida" ? "Tu sesión venció. Volvé a iniciar sesión." : conflicto ? "El producto cambió desde que lo abriste." : "No pudimos completar la acción. Intentá nuevamente."
  const imagenes = () => { if (alImagen) alImagen(); else navegar(() => router.push(`/admin/productos/${actual.id}/editar?paso=imagen`)) }
  return <div ref={grupoAcciones} role={enVistaPrevia ? "group" : undefined} aria-label={enVistaPrevia ? "Acciones del producto" : undefined} tabIndex={enVistaPrevia ? -1 : undefined} className={finalizar ? "space-y-3" : enVistaPrevia ? "rounded-md focus-visible:outline-2 focus-visible:outline-primary" : "contents"}>
    {aviso && <AvisoProductoGuardado key={aviso.numero} texto={aviso.texto} />}
    {finalizar ? <div className="flex flex-wrap gap-3">
      {accionCancelar?.(pendiente)}
      <PendingButton className="min-h-11" pending={operacion === "ocultar" || navegando} disabled={pendiente || disabled} pendingLabel={navegando ? "Cargando…" : etiquetas.ocultar} variant="outline" onClick={() => void ejecutar("ocultar")}>Guardar como oculto</PendingButton>
      <PendingButton ref={botonAccion} className="min-h-11" pending={operacion === "publicar"} pendingLabel={etiquetas.publicar} disabled={pendiente || disabled || !actual.tieneImagen || actual.publicado} onClick={() => void ejecutar("publicar")}>Publicar producto</PendingButton>
      {!actual.tieneImagen && <p className="w-full text-xs text-muted-foreground">Para publicar, agregá una imagen.</p>}
    </div> : <>{accionCancelar?.(pendiente)}<DropdownMenu><DropdownMenuTrigger asChild><Button ref={botonAccion} variant="outline" className={pendiente ? "size-11 shrink-0 gap-2 p-0 sm:w-auto sm:px-3" : "size-11 shrink-0 p-0"} disabled={pendiente || disabled} aria-busy={pendiente} aria-label={`Acciones de ${actual.nombre}`}>{pendiente ? <><Spinner /><span className="sr-only sm:not-sr-only">{operacion ? etiquetas[operacion] : "Cargando…"}</span></> : <MoreVertical aria-hidden="true" />}</Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        {!enVistaPrevia && (actual.publicado ? <DropdownMenuItem asChild className="min-h-11"><a href={`/catalogo/${actual.slug}`} target="_blank" rel="noopener noreferrer" aria-label="Ver producto (abre otra pestaña)">Ver producto<ExternalLink aria-hidden="true" /></a></DropdownMenuItem> : <DropdownMenuItem className="min-h-11" onSelect={() => navegar(() => router.push(`/admin/productos/${actual.id}/editar?paso=vista-previa`))}>Vista previa</DropdownMenuItem>)}
        {!editarVisible && <DropdownMenuItem className="min-h-11" onSelect={() => { if (alEditar) alEditar(); else navegar(() => router.push(`/admin/productos/${actual.id}/editar`)) }}>Editar</DropdownMenuItem>}
        <DropdownMenuItem className="min-h-11" onSelect={imagenes}>Gestionar imágenes</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="min-h-11" onSelect={() => void ejecutar(actual.publicado ? "ocultar" : "publicar")}>{actual.publicado ? "Ocultar" : "Publicar"}</DropdownMenuItem>
        <DropdownMenuItem className="min-h-11" onSelect={() => void ejecutar(actual.destacado ? "quitar_destacado" : "destacar")}>{actual.destacado ? "Quitar destacado" : "Destacar"}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu></>}
    {error && <div className="col-span-3 space-y-2 text-sm"><p role="alert" className="text-destructive">{mensaje}</p>
      {conflicto && <Button variant="outline" className="min-h-11" onClick={() => window.location.reload()}>Recargar datos</Button>}
      {error === "error_tecnico" && <Button variant="outline" className="min-h-11" disabled={pendiente} onClick={() => { if (ultimaAccion.current) void ejecutar(ultimaAccion.current) }}>Reintentar</Button>}
      {error === "imagen_requerida" && <Button variant="outline" className="min-h-11" onClick={imagenes}>Gestionar imágenes</Button>}
      {error === "sesion_requerida" && <Link href="/admin/login" className="underline">Iniciar sesión</Link>}
    </div>}
    <Dialog open={confirmacion !== null} onOpenChange={abierto => { if (!abierto) confirmar(null) }}>
      <DialogContent showCloseButton={false} className="max-h-[calc(100svh-2rem)] min-w-0 overflow-y-auto rounded-2xl text-center motion-reduce:animate-none" onOpenAutoFocus={evento => { evento.preventDefault(); volver.current?.focus() }} onCloseAutoFocus={evento => {
        evento.preventDefault()
        if (botonAccion.current && !botonAccion.current.disabled) botonAccion.current.focus()
        else grupoAcciones.current?.focus()
      }}>
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary"><Check className="size-6" aria-hidden="true" /></span>
        <DialogTitle className="font-serif text-2xl font-normal">¡Producto publicado!</DialogTitle>
        <DialogDescription asChild><div className="space-y-3">
          <p className="font-medium text-foreground [overflow-wrap:anywhere]">{confirmacion?.nombre}</p>
          <p>La publicación se completó correctamente.</p>
          <p aria-live="polite">{disponible === false ? "Está publicado, pero todavía no aparecerá en el listado del catálogo porque no tiene stock." : disponible === true ? "Está publicado y tiene stock disponible." : "Podés revisar su disponibilidad en Inventario."}</p>
        </div></DialogDescription>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <PendingButton ref={volver} className="min-h-11" pending={navegando} pendingLabel="Volviendo…" onClick={() => navegar(() => router.push("/admin/productos"))}>Volver a productos</PendingButton>
          {disponible === true ? <Button asChild variant="outline" className="min-h-11"><a href={`/catalogo/${confirmacion?.slug}`} target="_blank" rel="noopener noreferrer" aria-label="Ver producto (abre otra pestaña)">Ver producto<ExternalLink aria-hidden="true" /></a></Button> : <Button asChild variant="outline" className="min-h-11"><Link href="/admin/stock">Ir a Inventario</Link></Button>}
        </div>
        <DialogClose asChild><Button type="button" variant="ghost" size="icon" className="absolute right-2 top-2 size-11" aria-label="Cerrar confirmación"><X aria-hidden="true" /></Button></DialogClose>
      </DialogContent>
    </Dialog>
  </div>
}
