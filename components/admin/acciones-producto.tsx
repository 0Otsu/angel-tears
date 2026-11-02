"use client"
import { startTransition, useRef, useState, useTransition, type ReactNode } from "react"
import Link from "next/link"
import { MoreVertical } from "lucide-react"
import { useRouter } from "next/navigation"
import { cambiarPublicacionAccion } from "@/app/admin/(panel)/productos/publicacion-acciones"
import type { ProductoAdministrativo } from "@/lib/modulos/productos/administracion-contrato"
import type { ResultadoPublicacion } from "@/lib/modulos/productos/publicacion"
import { Spinner } from "@/components/ui/spinner"
import { PendingButton } from "@/components/ui/pending-button"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AvisoProductoGuardado } from "./aviso-producto-guardado"

type Accion = "publicar" | "ocultar" | "destacar" | "quitar_destacado"
const etiquetas = { publicar: "Publicando…", ocultar: "Ocultando…", destacar: "Destacando…", quitar_destacado: "Quitando destacado…" }
export function AccionesProducto({ producto, alGuardar, alNotificar, finalizar = false, disabled = false, alEditar, alImagen, accionCancelar }: { producto: ProductoAdministrativo; alGuardar?: (producto: ProductoAdministrativo) => void; alNotificar?: (texto: string) => void; finalizar?: boolean; disabled?: boolean; alEditar?: () => void; alImagen?: () => void; accionCancelar?: (pendiente: boolean) => ReactNode }) {
  const [operacion, setOperacion] = useState<Accion | null>(null)
  const ejecutando = useRef(false)
  const [navegando, navegar] = useTransition()
  const [error, setError] = useState<Exclude<ResultadoPublicacion["estado"], "ok"> | null>(null)
  const [aviso, notificar] = useState<{ texto: string; numero: number } | null>(null)
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
      setLocal(siguiente); alGuardar?.(siguiente)
      const texto = { publicar: "Producto publicado.", ocultar: "Producto ocultado.", destacar: "Producto destacado.", quitar_destacado: "Se quitó de destacados." }[accion]
      if (alNotificar) alNotificar(texto)
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
  return <div className={finalizar ? "space-y-3" : "contents"}>
    {aviso && <AvisoProductoGuardado key={aviso.numero} texto={aviso.texto} />}
    {finalizar ? <div className="flex flex-wrap gap-3">
      {accionCancelar?.(pendiente)}
      <PendingButton className="min-h-11" pending={operacion === "ocultar" || navegando} disabled={pendiente || disabled} pendingLabel={navegando ? "Cargando…" : etiquetas.ocultar} variant="outline" onClick={() => void ejecutar("ocultar")}>Guardar como oculto</PendingButton>
      <PendingButton className="min-h-11" pending={operacion === "publicar"} pendingLabel={etiquetas.publicar} disabled={pendiente || disabled || !actual.tieneImagen || actual.publicado} onClick={() => void ejecutar("publicar")}>Publicar producto</PendingButton>
      {!actual.tieneImagen && <p className="w-full text-xs text-muted-foreground">Para publicar, agregá una imagen.</p>}
    </div> : <>{accionCancelar?.(pendiente)}<DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className={pendiente ? "size-11 shrink-0 gap-2 p-0 sm:w-auto sm:px-3" : "size-11 shrink-0 p-0"} disabled={pendiente || disabled} aria-busy={pendiente} aria-label={`Acciones de ${actual.nombre}`}>{pendiente ? <><Spinner /><span className="sr-only sm:not-sr-only">{operacion ? etiquetas[operacion] : "Cargando…"}</span></> : <MoreVertical aria-hidden="true" />}</Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuItem className="min-h-11" onSelect={() => { if (alEditar) alEditar(); else navegar(() => router.push(`/admin/productos/${actual.id}/editar`)) }}>Editar</DropdownMenuItem>
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
  </div>
}
