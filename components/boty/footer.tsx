import Link from "next/link"
import { Instagram } from "lucide-react"
import { negocioPublico } from "@/lib/negocio-publico"

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-card pb-10 pt-20">
      <div className="pointer-events-none absolute bottom-0 left-1/2 z-0 -translate-x-1/2 select-none" aria-hidden="true"><span className="whitespace-nowrap font-serif text-[200px] font-bold leading-none text-white/20 md:text-[400px]">Angel Tears</span></div>
      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mb-16 grid grid-cols-2 gap-10 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <h2 className="mb-4 font-serif text-3xl text-foreground">Angel Tears</h2>
            <p className="mb-6 text-sm leading-relaxed text-muted-foreground">Bijouterie y accesorios en Concordia, Entre Ríos. Detalles para vos y para regalar.</p>
            <a href={negocioPublico.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram de Angel Tears" className="flex size-10 items-center justify-center rounded-full bg-background text-foreground/60 boty-shadow boty-transition hover:text-foreground"><Instagram className="size-4" /></a>
          </div>
          <div><h3 className="mb-4 font-medium text-foreground">Catálogo</h3><ul className="space-y-3 text-sm text-muted-foreground"><li><Link href="/catalogo" className="boty-transition hover:text-foreground">Todos los accesorios</Link></li><li><Link href="/#coleccion" className="boty-transition hover:text-foreground">Selección Angel Tears</Link></li></ul></div>
          <div><h3 className="mb-4 font-medium text-foreground">El local</h3><address className="text-sm not-italic leading-relaxed text-muted-foreground">{negocioPublico.direccion}<br />{negocioPublico.referencia}<br />{negocioPublico.ciudad}</address><a href={negocioPublico.comoLlegar} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm text-muted-foreground boty-transition hover:text-foreground">Cómo llegar</a></div>
          <div><h3 className="mb-4 font-medium text-foreground">Contacto</h3><ul className="space-y-3 text-sm text-muted-foreground"><li><a href={negocioPublico.instagram} target="_blank" rel="noopener noreferrer" className="boty-transition hover:text-foreground">{negocioPublico.usuarioInstagram}</a></li><li>WhatsApp pendiente</li><li><Link href="/#el-local" className="boty-transition hover:text-foreground">Consultar horarios</Link></li></ul></div>
        </div>
        <div className="border-t border-border/50 pt-10"><p className="text-center text-sm text-muted-foreground md:text-left">© 2026 Angel Tears. Todos los derechos reservados.</p></div>
      </div>
    </footer>
  )
}
