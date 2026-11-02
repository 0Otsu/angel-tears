"use client"
import { useState, useTransition, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { cambiarPublicacionAccion } from "@/app/admin/(panel)/productos/publicacion-acciones"
import type { ProductoAdministrativo } from "@/lib/modulos/productos/administracion-contrato"
import { Spinner } from "@/components/ui/spinner"
import { PendingButton } from "@/components/ui/pending-button"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function AccionesProducto({ producto, alGuardar, finalizar = false, alEditar, alImagen, accionCancelar }: { producto: ProductoAdministrativo; alGuardar?: (producto: ProductoAdministrativo) => void; finalizar?: boolean; alEditar?: () => void; alImagen?: () => void; accionCancelar?: (pendiente: boolean) => ReactNode }) {
  const [pendiente, iniciar] = useTransition()
  const [operacion, setOperacion] = useState("Guardando…")
  const [mensaje, setMensaje] = useState("")
  const [error, setError] = useState(false)
  const [sesionRequerida, setSesionRequerida] = useState(false)
  const router = useRouter()
  const [local, setLocal] = useState<ProductoAdministrativo | null>(null)
  const actual = local && local.version >= producto.version ? local : producto
  function ejecutar(accion: "publicar" | "ocultar" | "destacar" | "quitar_destacado") {
    if (pendiente) return
    setOperacion({ publicar: "Publicando…", ocultar: "Ocultando…", destacar: "Destacando…", quitar_destacado: "Quitando destacado…" }[accion])
    iniciar(async () => {
      try {
        const r = await cambiarPublicacionAccion({ id: actual.id, version: actual.version, accion })
        setError(r.estado !== "ok")
        setSesionRequerida(r.estado === "sesion_requerida")
        if (r.estado === "ok") {
          const siguiente = { ...actual, version: r.version, ...(accion === "publicar" || accion === "ocultar" ? { publicado: accion === "publicar" } : { destacado: accion === "destacar" }) }
          setLocal(siguiente); alGuardar?.(siguiente)
          setMensaje({ publicar: "Producto publicado.", ocultar: "Producto ocultado del sitio público.", destacar: "Producto destacado.", quitar_destacado: "Se quitó de destacados." }[accion])
          if (finalizar && accion === "ocultar") router.push("/admin/productos")
          else router.refresh()
        } else setMensaje(r.estado === "imagen_requerida" ? "Agregá una imagen válida antes de publicar." : r.estado === "sesion_requerida" ? "Tu sesión venció. Volvé a iniciar sesión." : r.estado === "conflicto_version" ? "El producto cambió. Recargá los datos actuales antes de continuar." : "No pudimos completar la acción. Conservamos el producto; intentá nuevamente.")
      } catch { setError(true); setMensaje("No pudimos completar la acción. Intentá nuevamente.") }
    })
  }
  return <div className={finalizar ? "space-y-2" : "contents"}>
    {finalizar ? <div className="flex flex-wrap gap-3">
      {accionCancelar?.(pendiente)}
      <PendingButton pending={pendiente && operacion === "Ocultando…"} disabled={pendiente} pendingLabel={operacion} variant="outline" onClick={() => ejecutar("ocultar")}>Guardar como oculto</PendingButton>
      <PendingButton pending={pendiente && operacion === "Publicando…"} pendingLabel={operacion} disabled={pendiente || !actual.tieneImagen || actual.publicado} onClick={() => ejecutar("publicar")}>Publicar producto</PendingButton>
      {!actual.tieneImagen && <p className="w-full text-sm">Podés conservarlo oculto y agregar la imagen después.</p>}
    </div> : <>{accionCancelar?.(pendiente)}<DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" disabled={pendiente} aria-busy={pendiente} aria-label={`Acciones de ${actual.nombre}`}>{pendiente ? <Spinner /> : "⋮"}</Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {alEditar ? <DropdownMenuItem disabled={pendiente} onSelect={alEditar}>Editar</DropdownMenuItem> : <DropdownMenuItem disabled={pendiente} onSelect={() => { setOperacion("Abriendo edición…"); iniciar(() => router.push(`/admin/productos/${actual.id}/editar`)) }}>Editar</DropdownMenuItem>}
        {alImagen ? <DropdownMenuItem disabled={pendiente} onSelect={alImagen}>Cambiar imagen</DropdownMenuItem> : <DropdownMenuItem disabled={pendiente} onSelect={() => { setOperacion("Abriendo imagen…"); iniciar(() => router.push(`/admin/productos/${actual.id}/editar?paso=imagen`)) }}>Cambiar imagen</DropdownMenuItem>}
        <DropdownMenuItem disabled={pendiente} onSelect={() => ejecutar(actual.publicado ? "ocultar" : "publicar")}>{actual.publicado ? "Ocultar" : "Publicar"}</DropdownMenuItem>
        <DropdownMenuItem disabled={pendiente} onSelect={() => ejecutar(actual.destacado ? "quitar_destacado" : "destacar")}>{actual.destacado ? "Quitar destacado" : "Destacar"}</DropdownMenuItem>
      </DropdownMenuContent></DropdownMenu></>}
    <p role={error ? "alert" : "status"} aria-live="polite" className={`col-span-3 text-sm ${!mensaje && !pendiente ? "sr-only" : ""}`}>{pendiente ? operacion : mensaje}</p>
    {error && <Button className="col-span-3" variant="outline" onClick={() => window.location.reload()}>Recargar datos actuales</Button>}
    {sesionRequerida && <Link href="/admin/login" className="col-span-3 block text-sm underline">Iniciar sesión</Link>}
  </div>
}
