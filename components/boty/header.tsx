"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X, Instagram, MessageCircle } from "lucide-react"
import { negocioPublico } from "@/lib/negocio-publico"

const enlaces = [
  { nombre: "Catálogo", href: "/catalogo" },
  { nombre: "El local", href: "/#el-local" },
  { nombre: "Contacto", href: "/#contacto" },
]

export function Header() {
  const [abierto, setAbierto] = useState(false)
  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4">
      <nav aria-label="Navegación principal" className="mx-auto max-w-7xl rounded-lg border border-[rgba(255,255,255,0.32)] bg-[rgba(255,255,255,0.4)] px-4 backdrop-blur-md lg:px-8" style={{ boxShadow: "rgba(0, 0, 0, 0.1) 0px 10px 50px" }}>
        <div className="relative flex h-[68px] items-center justify-between">
          <button type="button" className="p-2 text-foreground/80 boty-transition hover:text-foreground lg:hidden" aria-label={abierto ? "Cerrar menú" : "Abrir menú"} aria-expanded={abierto} aria-controls="menu-publico-movil" onClick={() => setAbierto(!abierto)}>
            {abierto ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <div className="hidden items-center gap-8 lg:flex">
            {enlaces.map(enlace => <Link key={enlace.nombre} href={enlace.href} className="text-sm tracking-wide text-foreground/70 boty-transition hover:text-foreground">{enlace.nombre}</Link>)}
          </div>
          <Link href="/" onClick={() => setAbierto(false)} aria-label="Angel Tears, inicio" className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap font-serif text-[26px] tracking-wider text-foreground sm:text-3xl">Angel Tears</Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <a href={negocioPublico.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram de Angel Tears (abre otra pestaña)" className="hidden p-2 text-foreground/70 boty-transition hover:text-foreground sm:block"><Instagram className="size-5" /></a>
            <button type="button" disabled title="WhatsApp: canal pendiente de confirmar" aria-label="WhatsApp no disponible por el momento" className="cursor-not-allowed p-2 text-foreground/40"><MessageCircle className="size-5" /></button>
          </div>
        </div>
        {abierto && <div id="menu-publico-movil" className="pb-6 lg:hidden"><div className="flex flex-col gap-4 border-t border-border/50 pt-4">
          {enlaces.map(enlace => <Link key={enlace.nombre} href={enlace.href} onClick={() => setAbierto(false)} className="text-sm tracking-wide text-foreground/70 hover:text-foreground">{enlace.nombre}</Link>)}
          <a href={negocioPublico.instagram} target="_blank" rel="noopener noreferrer" className="text-sm tracking-wide text-foreground/70 hover:text-foreground">Instagram · {negocioPublico.usuarioInstagram}</a>
        </div></div>}
      </nav>
    </header>
  )
}
