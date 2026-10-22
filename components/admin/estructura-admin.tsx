"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Package, Boxes, Truck, ShoppingBag, Receipt, Wallet, BarChart3, Settings, User, Menu, ExternalLink, ChevronRight, Sparkles } from "lucide-react"
import { BotonCerrarSesion } from "@/components/admin/boton-cerrar-sesion"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

const navegacion = [
  { ruta: "/admin", nombre: "Resumen", icono: LayoutDashboard },
  { ruta: "/admin/productos", nombre: "Productos", icono: Package },
  { ruta: "/admin/stock", nombre: "Stock", icono: Boxes },
  { ruta: "/admin/proveedores", nombre: "Proveedores", icono: Truck },
  { ruta: "/admin/compras", nombre: "Compras", icono: ShoppingBag },
  { ruta: "/admin/ventas", nombre: "Ventas", icono: Receipt },
  { ruta: "/admin/egresos", nombre: "Egresos", icono: Wallet },
  { ruta: "/admin/reportes", nombre: "Reportes", icono: BarChart3 },
  { ruta: "/admin/cuenta", nombre: "Cuenta", icono: User },
  { ruta: "/admin/configuracion", nombre: "Configuración", icono: Settings },
]

function NavegacionAdmin({ alNavegar }: { alNavegar?: () => void }) {
  const ruta = usePathname()
  return <nav aria-label="Módulos administrativos" className="space-y-1">{navegacion.map(({ ruta: destino, nombre, icono: Icono }) => <Link key={destino} href={destino} onClick={alNavegar} aria-current={ruta === destino ? "page" : undefined} className={cn("flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary", ruta === destino ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-card hover:text-foreground")}><Icono className="size-4" aria-hidden="true" /><span>{nombre}</span>{ruta === destino && <ChevronRight className="ml-auto size-3.5" aria-hidden="true" />}</Link>)}</nav>
}

function MarcaAdmin() {
  return <Link href="/admin" className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-primary"><Sparkles className="size-4" aria-hidden="true" /></span><span><span className="block font-serif text-2xl tracking-tight">Angel Tears</span><span className="block text-[9px] uppercase tracking-[0.22em] text-muted-foreground">Panel administrativo</span></span></Link>
}

// nombre y email son los de la sesion real; los entrega el layout del panel, que ya exigio sesion.
export function EstructuraAdmin({ children, nombre, email }: { children: ReactNode; nombre: string; email: string }) {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const ruta = usePathname()
  const actual = navegacion.find(item => item.ruta === ruta)?.nombre ?? "Administración"
  return <div className="min-h-svh bg-background text-foreground">
    <a href="#contenido-admin" className="sr-only z-[60] rounded-lg bg-primary px-4 py-3 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Saltar al contenido</a>
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col overflow-y-auto border-r border-border/70 bg-card/30 p-5 lg:flex">
      <div className="pb-10 pt-2"><MarcaAdmin /></div>
      <p className="mb-3 px-3.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Tu negocio</p>
      <NavegacionAdmin />
      <div className="mt-auto space-y-4 pt-8"><div className="rounded-xl border border-border/70 bg-background/70 p-4"><p className="text-xs font-medium text-primary">Un espacio para cada detalle.</p><p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">Navegación de muestra.<br />Sin conexión a datos reales.</p></div><BotonCerrarSesion /></div>
    </aside>

    <div className="min-w-0 lg:ml-60">
      <header className="sticky top-0 z-20 flex h-18 items-center justify-between gap-3 border-b border-border/70 bg-background/95 px-4 backdrop-blur-md lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Sheet open={menuAbierto} onOpenChange={setMenuAbierto}>
            <SheetTrigger asChild><Button variant="ghost" size="icon" className="size-11 lg:hidden" aria-label="Abrir navegación administrativa"><Menu className="size-5" /></Button></SheetTrigger>
            <SheetContent side="left" className="w-[min(320px,88vw)] gap-0 overflow-y-auto p-5 sm:max-w-none">
              <SheetTitle className="pr-6 font-serif text-2xl">Angel Tears</SheetTitle><SheetDescription className="mb-7 mt-1 text-xs">Administración · navegación de prototipo</SheetDescription>
              <NavegacionAdmin alNavegar={() => setMenuAbierto(false)} /><div className="mt-auto pt-6"><BotonCerrarSesion /></div>
            </SheetContent>
          </Sheet>
          <p className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">Administración<ChevronRight className="size-3" aria-hidden="true" /><span className="text-foreground">{actual}</span></p>
          <span className="font-serif text-xl sm:hidden">Angel Tears</span>
        </div>
        <div className="flex shrink-0 items-center gap-3 lg:gap-5">
          <Link href="/" className="hidden items-center gap-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary sm:flex">Ver sitio público<ExternalLink className="size-3.5" aria-hidden="true" /></Link>
          <div className="flex items-center gap-2.5"><span className="flex size-9 items-center justify-center rounded-full border border-border bg-card text-xs font-medium text-primary" aria-hidden="true">{(nombre.trim()[0] ?? "A").toUpperCase()}</span><span className="hidden sm:block"><span className="block text-xs font-medium">{nombre}</span><span className="block text-[10px] text-muted-foreground">{email}</span></span><span className="sr-only sm:hidden">{nombre} · {email}</span></div>
        </div>
      </header>
      <main id="contenido-admin" tabIndex={-1} className="mx-auto max-w-[1440px] space-y-6 p-4 pb-10 outline-none lg:p-8">{children}</main>
      <footer className="flex flex-wrap justify-between gap-2 border-t border-border/70 px-4 py-4 text-[10px] text-muted-foreground lg:px-8"><span>Angel Tears · Prototipo de administración</span><span>Datos de demostración · sin persistencia</span></footer>
    </div>
  </div>
}
