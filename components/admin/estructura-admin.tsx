"use client"

import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Package, ArrowLeftRight, User, ExternalLink, ChevronDown } from "lucide-react"
import logo from "@/app/icon.png"
import { BotonCerrarSesion } from "@/components/admin/boton-cerrar-sesion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from "@/components/ui/dropdown-menu"

const operaciones = [
  { ruta: "/admin/ventas", nombre: "Ventas" },
  { ruta: "/admin/compras", nombre: "Compras" },
  { ruta: "/admin/gastos", nombre: "Gastos" },
  { ruta: "/admin/proveedores", nombre: "Proveedores" },
]
const navegacion = [
  { ruta: "/admin", nombre: "Resumen", icono: LayoutDashboard },
  { ruta: "/admin/productos", nombre: "Productos", icono: Package },
  { ruta: "/admin/ventas", nombre: "Operaciones", icono: ArrowLeftRight },
]
function pertenece(ruta: string, destino: string) {
  const rutas = destino === "/admin/ventas" ? operaciones : [{ ruta: destino }]
  return rutas.some(item => ruta === item.ruta || item.ruta !== "/admin" && ruta.startsWith(`${item.ruta}/`))
}
function NavegacionAdmin() {
  const ruta = usePathname()
  return <nav aria-label="Módulos administrativos" className="grid grid-cols-3 gap-1 lg:flex lg:justify-center lg:gap-2">{navegacion.map(({ ruta: destino, nombre, icono: Icono }) => {
    const activo = pertenece(ruta, destino)
    return <Link key={destino} href={destino} aria-current={activo ? ruta === destino ? "page" : "location" : undefined} className={cn("inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transition-none sm:px-4 sm:text-sm", activo ? "bg-primary font-medium text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-card hover:text-foreground")}><Icono className="hidden size-4 shrink-0 sm:block" aria-hidden="true" /><span>{nombre}</span></Link>
  })}</nav>
}
function MarcaAdmin() {
  return <Link href="/admin" className="inline-flex min-h-11 min-w-0 shrink-0 items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Image src={logo} alt="" width={40} height={40} sizes="40px" className="size-8 rounded-lg object-contain sm:size-10"/><span><span className="block whitespace-nowrap font-serif text-base tracking-tight sm:text-xl">Angel Tears</span><span className="block text-[8px] uppercase tracking-[0.1em] text-muted-foreground sm:text-[9px]">Panel administrativo</span></span></Link>
}

// El layout autorizado entrega la identidad real; el shell no sustituye los guards.
export function EstructuraAdmin({ children, nombre, email }: { children: ReactNode; nombre: string; email: string }) {
  const ruta = usePathname(), enOperaciones = pertenece(ruta, "/admin/ventas")
  const productosPersistidos = ruta === "/admin/productos" || ruta.startsWith("/admin/productos/")
  return <div className="min-h-svh bg-background text-foreground">
    <a href="#contenido-admin" className="sr-only z-[60] rounded-lg bg-primary px-4 py-3 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Saltar al contenido</a>
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-x-2 gap-y-2 px-4 py-2 sm:gap-x-4 sm:px-6 lg:min-h-18 lg:flex-nowrap lg:px-8">
        <div className="order-1"><MarcaAdmin/></div>
        <div className="order-3 w-full lg:order-2 lg:w-auto lg:flex-1"><NavegacionAdmin/></div>
        <div className="order-2 flex shrink-0 items-center gap-1 sm:gap-3 lg:order-3">
          <Button asChild variant="outline" className="min-h-11 gap-1 px-2 text-[11px] sm:gap-2 sm:px-3 sm:text-xs"><Link href="/"><ExternalLink className="size-3.5 sm:size-4" aria-hidden="true"/>Ver tienda</Link></Button>
          <DropdownMenu><DropdownMenuTrigger asChild><button type="button" aria-label={`Menú de usuario: ${nombre}`} className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl px-1 focus-visible:outline-2 focus-visible:outline-primary"><span className="flex size-8 items-center justify-center rounded-full border border-border bg-card text-xs font-medium text-primary sm:size-9" aria-hidden="true">{(nombre.trim()[0] ?? "A").toUpperCase()}</span><span className="hidden max-w-44 text-left xl:block"><span className="block truncate text-xs font-medium">{nombre}</span><span className="block truncate text-[10px] text-muted-foreground">{email}</span></span><ChevronDown className="size-3 shrink-0" aria-hidden="true"/></button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-w-[calc(100vw-2rem)] min-w-56"><DropdownMenuLabel className="break-words"><span className="block">{nombre}</span><span className="block text-xs font-normal text-muted-foreground">{email}</span></DropdownMenuLabel><DropdownMenuSeparator/><DropdownMenuItem asChild className="min-h-11"><Link href="/admin/cuenta"><User aria-hidden="true"/>Mi cuenta</Link></DropdownMenuItem><DropdownMenuSeparator/><BotonCerrarSesion enMenu/></DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
    <main id="contenido-admin" tabIndex={-1} className="mx-auto max-w-[1440px] space-y-6 p-4 pb-10 outline-none sm:p-6 lg:p-8">
      {enOperaciones && <nav aria-label="Navegación de Operaciones" className="grid grid-cols-2 gap-1 border-b border-border pb-3 min-[375px]:grid-cols-4 sm:flex sm:gap-2">{operaciones.map(item => <Link key={item.ruta} href={item.ruta} aria-current={ruta === item.ruta ? "page" : undefined} className={cn("inline-flex min-h-11 items-center justify-center rounded-xl px-2 text-xs focus-visible:outline-2 focus-visible:outline-primary sm:px-4 sm:text-sm", ruta === item.ruta ? "border border-primary/30 bg-primary/10 font-medium text-primary underline underline-offset-4" : "text-muted-foreground hover:bg-card")}>{item.nombre}</Link>)}</nav>}
      {children}
    </main>
    {!productosPersistidos && !["/admin", "/admin/stock", "/admin/proveedores", "/admin/compras", "/admin/ventas", "/admin/egresos", "/admin/gastos", "/admin/finanzas"].includes(ruta) && <footer className="mx-auto flex max-w-[1440px] flex-wrap justify-between gap-2 border-t border-border/70 px-4 py-4 text-[10px] text-muted-foreground sm:px-6 lg:px-8"><span>Angel Tears · Prototipo de administración</span><span>Datos de demostración · sin persistencia</span></footer>}
  </div>
}
