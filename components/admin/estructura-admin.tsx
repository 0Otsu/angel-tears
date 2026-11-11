"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Package, Boxes, ArrowLeftRight, BarChart3, User, Menu, ExternalLink, ChevronRight, ChevronDown, Sparkles } from "lucide-react"
import { BotonCerrarSesion } from "@/components/admin/boton-cerrar-sesion"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from "@/components/ui/dropdown-menu"

const operaciones = [
  { ruta: "/admin/ventas", nombre: "Ventas" },
  { ruta: "/admin/compras", nombre: "Compras" },
  { ruta: "/admin/proveedores", nombre: "Proveedores" },
]
const finanzas = [
  { ruta: "/admin/finanzas", nombre: "Resumen financiero" },
  { ruta: "/admin/egresos", nombre: "Egresos" },
]

const navegacion = [
  { ruta: "/admin", nombre: "Resumen", icono: LayoutDashboard },
  { ruta: "/admin/productos", nombre: "Productos", icono: Package },
  { ruta: "/admin/stock", nombre: "Inventario", icono: Boxes },
  { ruta: "/admin/ventas", nombre: "Operaciones", icono: ArrowLeftRight },
  { ruta: "/admin/finanzas", nombre: "Finanzas", icono: BarChart3 },
]

function pertenece(ruta: string, destino: string) {
  const rutas = destino === "/admin/ventas" ? operaciones : destino === "/admin/finanzas" ? finanzas : [{ ruta: destino }]
  return rutas.some(item => ruta === item.ruta || item.ruta !== "/admin" && ruta.startsWith(`${item.ruta}/`))
}

function NavegacionAdmin({ alNavegar }: { alNavegar?: () => void }) {
  const ruta = usePathname()
  return <nav aria-label="Módulos administrativos" className="space-y-1">{navegacion.map(({ ruta: destino, nombre, icono: Icono }) => {
    const activo = pertenece(ruta, destino)
    return <Link key={destino} href={destino} onClick={alNavegar} aria-current={activo ? ruta === destino ? "page" : "location" : undefined} className={cn("flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary", activo ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-card hover:text-foreground")}><Icono className="size-4" aria-hidden="true" /><span>{nombre}</span>{activo && <ChevronRight className="ml-auto size-3.5" aria-hidden="true" />}</Link>
  })}</nav>
}

function MarcaAdmin() {
  return <Link href="/admin" className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-primary"><Sparkles className="size-4" aria-hidden="true" /></span><span><span className="block font-serif text-2xl tracking-tight">Angel Tears</span><span className="block text-[9px] uppercase tracking-[0.22em] text-muted-foreground">Panel administrativo</span></span></Link>
}

// nombre y email son los de la sesion real; los entrega el layout del panel, que ya exigio sesion.
export function EstructuraAdmin({ children, nombre, email }: { children: ReactNode; nombre: string; email: string }) {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const ruta = usePathname()
  const area = pertenece(ruta, "/admin/ventas") ? "Operaciones" : pertenece(ruta, "/admin/finanzas") ? "Finanzas" : null
  const secundaria = area === "Operaciones" ? operaciones : area === "Finanzas" ? finanzas : []
  const actual = secundaria.find(item => item.ruta === ruta)?.nombre ?? (ruta === "/admin/cuenta" ? "Mi cuenta" : ruta === "/admin/configuracion" ? "Configuración" : navegacion.find(item => pertenece(ruta, item.ruta))?.nombre ?? "Administración")
  const productosPersistidos = ruta === "/admin/productos" || ruta.startsWith("/admin/productos/")
  return <div className="min-h-svh bg-background text-foreground">
    <a href="#contenido-admin" className="sr-only z-[60] rounded-lg bg-primary px-4 py-3 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Saltar al contenido</a>
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col overflow-y-auto border-r border-border/70 bg-card/30 p-5 lg:flex">
      <div className="pb-10 pt-2"><MarcaAdmin /></div>
      <p className="mb-3 px-3.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Tu negocio</p>
      <NavegacionAdmin />
      <div className="mt-auto pt-8"><BotonCerrarSesion /></div>
    </aside>

    <div className="min-w-0 lg:ml-60">
      <header className="sticky top-0 z-20 flex h-18 items-center justify-between gap-3 border-b border-border/70 bg-background/95 px-4 backdrop-blur-md lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Sheet open={menuAbierto} onOpenChange={setMenuAbierto}>
            <SheetTrigger asChild><Button variant="ghost" size="icon" className="size-11 lg:hidden" aria-label="Abrir navegación administrativa"><Menu className="size-5" /></Button></SheetTrigger>
            <SheetContent side="left" className="w-[min(320px,88vw)] gap-0 overflow-y-auto p-5 sm:max-w-none">
              <SheetTitle className="pr-6 font-serif text-2xl">Angel Tears</SheetTitle><SheetDescription className="mb-7 mt-1 text-xs">Panel administrativo</SheetDescription>
              <NavegacionAdmin alNavegar={() => setMenuAbierto(false)} /><div className="mt-auto pt-6"><BotonCerrarSesion /></div>
            </SheetContent>
          </Sheet>
          {productosPersistidos ? ruta !== "/admin/productos" && <nav aria-label="Ubicación" className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex"><Link href="/admin/productos" className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-primary">Productos</Link><ChevronRight className="size-3" aria-hidden="true" /><span>{ruta.endsWith("/nuevo") ? "Nuevo producto" : "Editar producto"}</span></nav> : <p className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">Administración<ChevronRight className="size-3" aria-hidden="true" /><span className="text-foreground">{actual}</span></p>}
          <span className="font-serif text-xl sm:hidden">Angel Tears</span>
        </div>
        <div className="flex shrink-0 items-center gap-3 lg:gap-5">
          <Link href="/" className="hidden items-center gap-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary sm:flex">Ver sitio público<ExternalLink className="size-3.5" aria-hidden="true" /></Link>
          <DropdownMenu><DropdownMenuTrigger asChild><button type="button" aria-label={`Menú de usuario: ${nombre}`} className="flex min-h-11 min-w-11 items-center gap-2.5 rounded-xl px-1 focus-visible:outline-2 focus-visible:outline-primary"><span className="flex size-9 items-center justify-center rounded-full border border-border bg-card text-xs font-medium text-primary" aria-hidden="true">{(nombre.trim()[0] ?? "A").toUpperCase()}</span><span className="hidden text-left sm:block"><span className="block text-xs font-medium">{nombre}</span><span className="block text-[10px] text-muted-foreground">{email}</span></span><ChevronDown className="size-3.5" aria-hidden="true" /></button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-w-[calc(100vw-2rem)] min-w-56"><DropdownMenuLabel className="break-words"><span className="block">{nombre}</span><span className="block text-xs font-normal text-muted-foreground">{email}</span></DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem asChild className="min-h-11"><Link href="/admin/cuenta"><User aria-hidden="true" />Mi cuenta</Link></DropdownMenuItem><DropdownMenuSeparator /><BotonCerrarSesion enMenu /></DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <main id="contenido-admin" tabIndex={-1} className="mx-auto max-w-[1440px] space-y-6 p-4 pb-10 outline-none lg:p-8">{area && <nav aria-label={`Navegación de ${area}`} className="flex flex-wrap gap-2 border-b border-border pb-4">{secundaria.map(item => <Link key={item.ruta} href={item.ruta} aria-current={ruta === item.ruta ? "page" : undefined} className={cn("inline-flex min-h-11 items-center rounded-xl px-4 text-sm focus-visible:outline-2 focus-visible:outline-primary", ruta === item.ruta ? "border border-primary/30 bg-primary/10 font-medium text-primary underline underline-offset-4" : "text-muted-foreground hover:bg-card")}>{item.nombre}</Link>)}</nav>}{children}</main>
      {!productosPersistidos && !["/admin", "/admin/stock", "/admin/proveedores", "/admin/compras", "/admin/ventas", "/admin/egresos"].includes(ruta) && <footer className="flex flex-wrap justify-between gap-2 border-t border-border/70 px-4 py-4 text-[10px] text-muted-foreground lg:px-8"><span>Angel Tears · Prototipo de administración</span><span>Datos de demostración · sin persistencia</span></footer>}
    </div>
  </div>
}
