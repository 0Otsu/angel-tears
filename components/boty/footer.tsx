import Link from "next/link"
import { Instagram, MessageCircle } from "lucide-react"
import { negocioPublico } from "@/lib/negocio-publico"

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-brand-subtle py-10 lg:pt-14">
      <div className="pointer-events-none absolute bottom-0 left-1/2 z-0 -translate-x-1/2 select-none" aria-hidden="true"><span className="whitespace-nowrap font-serif text-[200px] font-bold leading-none text-white/20 md:text-[400px]">Angel Tears</span></div>
      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mb-10 grid grid-cols-1 gap-x-8 gap-y-8 min-[480px]:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1.2fr_1fr] lg:gap-10">
          <div className="min-w-0">
            <h2 className="mb-4 font-serif text-3xl text-foreground">Angel Tears</h2>
            <p className="mb-4 max-w-xs text-sm leading-relaxed text-muted-foreground">Bijouterie y accesorios en Concordia, Entre Ríos. Detalles para vos y para regalar.</p>
            <div className="flex items-center gap-3">
              {[{href:negocioPublico.instagram,nombre:'Instagram',Icono:Instagram},{href:negocioPublico.whatsapp,nombre:'WhatsApp',Icono:MessageCircle}].map(({href,nombre,Icono})=><a key={nombre} href={href} target="_blank" rel="noopener noreferrer" aria-label={`${nombre} de Angel Tears (abre otra pestaña)`} className="inline-flex size-11 items-center justify-center rounded-full bg-background text-primary boty-shadow boty-transition hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"><Icono className="size-5" aria-hidden="true"/></a>)}
            </div>
          </div>
          <div><h3 className="mb-4 font-medium text-foreground">Catálogo</h3><ul className="space-y-3 text-sm text-muted-foreground"><li><Link href="/catalogo" className="boty-transition hover:text-foreground">Todos los accesorios</Link></li><li><Link href="/#coleccion" className="boty-transition hover:text-foreground">Selección Angel Tears</Link></li></ul></div>
          <div><h3 className="mb-4 font-medium text-foreground">El local</h3><address className="text-sm not-italic leading-relaxed text-muted-foreground">{negocioPublico.direccion}<br />{negocioPublico.referencia}<br />{negocioPublico.ciudad}</address><a href={negocioPublico.comoLlegar} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm text-muted-foreground boty-transition hover:text-foreground">Cómo llegar</a></div>
          <div><h3 className="mb-4 font-medium text-foreground">Contacto</h3><ul className="space-y-3 text-sm text-muted-foreground"><li><a href={negocioPublico.instagram} target="_blank" rel="noopener noreferrer" className="boty-transition hover:text-foreground">{negocioPublico.usuarioInstagram}</a></li><li><a href={negocioPublico.whatsapp} target="_blank" rel="noopener noreferrer" className="boty-transition hover:text-foreground">Consultar por WhatsApp</a></li><li><Link href="/#el-local" className="boty-transition hover:text-foreground">Consultar horarios</Link></li></ul></div>
        </div>
        <div className="border-t border-border/50 pt-6"><p className="text-center text-sm text-muted-foreground md:text-left">© 2026 Angel Tears. Todos los derechos reservados.</p></div>
      </div>
    </footer>
  )
}
