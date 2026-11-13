import { ArrowRight, MessageCircle } from "lucide-react"
import { negocioPublico } from "@/lib/negocio-publico"
import identidad from "@/components/publico/identidad.module.css"

// Newsletter original de Boty: mismos contenedores, jerarquía, espaciados y botón.
// El formulario simulado se sustituye por el canal real de contacto.
export function Contacto() {
  return (
    <section id="contacto" aria-labelledby="contacto-heading" className={`py-16 lg:py-20 bg-primary ${identidad.ancla}`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <h2 id="contacto-heading" className="font-serif text-4xl leading-tight text-primary-foreground mb-4 text-balance md:text-7xl">
            ¿Tenés alguna consulta?
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-base leading-relaxed text-primary-foreground/80 sm:text-lg">
            Escribinos por WhatsApp para consultar por un accesorio o seguinos en Instagram para conocer las novedades.
          </p>
          <div className="mx-auto flex max-w-xl flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <a href={negocioPublico.instagram} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center justify-center gap-2 bg-primary-foreground text-primary px-8 py-4 rounded-full text-sm tracking-wide boty-transition hover:bg-primary-foreground/90">
              Ver Instagram
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 boty-transition" aria-hidden="true" />
            </a>
            <a href={negocioPublico.whatsapp} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center justify-center gap-2 bg-primary-foreground text-primary px-8 py-4 rounded-full text-sm tracking-wide boty-transition hover:bg-primary-foreground/90">
              Consultar por WhatsApp
              <MessageCircle className="w-4 h-4" aria-hidden="true" />
            </a>
          </div>

        </div>
      </div>
    </section>
  )
}
