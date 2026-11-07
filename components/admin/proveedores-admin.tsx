"use client"
import { useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Search } from "lucide-react"
import { cambiarActividadProveedorAccion } from "@/app/admin/(panel)/proveedores/acciones"
import type { ProveedorAdministrativo, ResultadoProveedorAdmin } from "@/lib/modulos/proveedores/administracion-contrato"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PendingButton } from "@/components/ui/pending-button"
import { EncabezadoAdmin, PanelAdmin, EtiquetaEstado } from "./piezas-admin"
import { AvisoProductoGuardado } from "./aviso-producto-guardado"
import { DialogoProveedor } from "./dialogo-proveedor"

type Filtro = "" | "activos" | "inactivos"

function errorDe(r: ResultadoProveedorAdmin) {
  switch (r.estado) {
    case "conflicto_version": return "El proveedor cambió desde que lo abriste. Recargá el listado."
    case "no_encontrado": return "El proveedor ya no está disponible. Recargá el listado."
    case "sesion_requerida": return "Tu sesión venció. Volvé a iniciar sesión."
    default: return "No pudimos completar la acción. Intentá nuevamente."
  }
}

function FilaProveedor({ proveedor, alNotificar }: { proveedor: ProveedorAdministrativo; alNotificar: (texto: string) => void }) {
  const [pendiente, ocupar] = useState(false)
  const [error, setError] = useState<ResultadoProveedorAdmin | null>(null)
  const enCurso = useRef(false)
  const router = useRouter()

  async function cambiarActividad() {
    if (enCurso.current) return
    enCurso.current = true; ocupar(true); setError(null)
    try {
      let respuesta: ResultadoProveedorAdmin
      try { respuesta = await cambiarActividadProveedorAccion({ id: proveedor.id, version: proveedor.version }, !proveedor.activo) }
      catch { respuesta = { estado: "error_tecnico" } }
      if (respuesta.estado === "ok") {
        alNotificar(proveedor.activo ? `Proveedor ${proveedor.nombre} inactivado.` : `Proveedor ${proveedor.nombre} reactivado.`)
        router.refresh()
      } else setError(respuesta)
    } finally { enCurso.current = false; ocupar(false) }
  }

  return <li><PanelAdmin className="grid min-w-0 gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
    <div className="min-w-0 space-y-2">
      <div className="flex flex-wrap items-center gap-3"><h2 className="break-words font-medium leading-snug">{proveedor.nombre}</h2><EtiquetaEstado tono={proveedor.activo ? "oliva" : "neutro"}>{proveedor.activo ? "Activo" : "Inactivo"}</EtiquetaEstado></div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {proveedor.telefono && <span>Tel: {proveedor.telefono}</span>}
        {proveedor.instagram && <span>Instagram: {proveedor.instagram}</span>}
        {!proveedor.telefono && !proveedor.instagram && <span>Sin datos de contacto</span>}
      </div>
      {proveedor.nota && <p className="break-words text-sm">{proveedor.nota}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{errorDe(error)}{error.estado === "sesion_requerida" && <> <Link href="/admin/login" className="underline">Iniciar sesión</Link></>}</p>}
    </div>
    <div className="flex flex-wrap gap-2">
      <DialogoProveedor proveedor={proveedor} alGuardar={alNotificar}><Button variant="outline" className="min-h-11" aria-label={`Editar proveedor ${proveedor.nombre}`}>Editar</Button></DialogoProveedor>
      <PendingButton variant="outline" className="min-h-11" pending={pendiente} pendingLabel={proveedor.activo ? "Inactivando…" : "Reactivando…"} onClick={() => void cambiarActividad()} aria-label={`${proveedor.activo ? "Inactivar" : "Reactivar"} proveedor ${proveedor.nombre}`}>{proveedor.activo ? "Inactivar" : "Reactivar"}</PendingButton>
    </div>
  </PanelAdmin></li>
}

export function ProveedoresAdmin({ proveedores, errorCarga = false }: { proveedores: ProveedorAdministrativo[]; errorCarga?: boolean }) {
  const [busqueda, buscar] = useState("")
  const [filtro, filtrar] = useState<Filtro>("")
  const [aviso, notificar] = useState<{ texto: string; numero: number } | null>(null)
  const avisar = (texto: string) => notificar(prev => ({ texto, numero: (prev?.numero ?? 0) + 1 }))
  const visibles = proveedores.filter(p =>
    `${p.nombre} ${p.telefono ?? ""} ${p.instagram ?? ""}`.toLocaleLowerCase().includes(busqueda.toLocaleLowerCase())
    && (filtro === "" || (filtro === "activos") === p.activo))
  const nuevo = <DialogoProveedor alGuardar={avisar}><Button className="h-12 gap-2 px-5 text-sm"><Plus aria-hidden="true" className="size-5" />Nuevo proveedor</Button></DialogoProveedor>
  return <>
    <EncabezadoAdmin titulo="Proveedores" simple>{!errorCarga && proveedores.length > 0 && nuevo}</EncabezadoAdmin>
    {aviso && <AvisoProductoGuardado key={aviso.numero} texto={aviso.texto} />}
    {errorCarga ? <PanelAdmin className="space-y-3 p-5"><p role="alert">No pudimos consultar los proveedores.</p><Link href="/admin/proveedores" className="underline">Reintentar consulta</Link></PanelAdmin>
      : proveedores.length === 0 ? <PanelAdmin className="flex min-h-56 flex-col items-center justify-center gap-5 p-6 text-center"><h2 className="font-serif text-2xl">Todavía no hay proveedores</h2>{nuevo}</PanelAdmin>
      : <>
        <div role="search" aria-label="Filtrar proveedores" className="grid gap-3 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-2"><Label htmlFor="proveedores-busqueda">Buscar</Label><div className="relative"><Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-muted-foreground" /><Input id="proveedores-busqueda" className="h-11 pl-10" placeholder="Nombre, teléfono o Instagram" value={busqueda} onChange={e => buscar(e.target.value)} /></div></div>
          <div className="min-w-0 space-y-2"><Label htmlFor="proveedores-estado">Estado</Label><select id="proveedores-estado" className="h-11 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary" value={filtro} onChange={e => filtrar(e.target.value as Filtro)}><option value="">Todos</option><option value="activos">Activos</option><option value="inactivos">Inactivos</option></select></div>
        </div>
        <p role="status" className="text-xs text-muted-foreground">{visibles.length} {visibles.length === 1 ? "proveedor" : "proveedores"}</p>
        {visibles.length === 0 && <p>No hay proveedores que coincidan con estos filtros.</p>}
        <ul aria-label="Proveedores registrados" className="space-y-3">{visibles.map(p => <FilaProveedor key={`${p.id}-${p.version}`} proveedor={p} alNotificar={avisar} />)}</ul>
      </>}
  </>
}
