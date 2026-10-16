import { ArrowRight } from "lucide-react"
import { negocioPublico } from "@/lib/negocio-publico"
import identidad from "@/components/publico/identidad.module.css"

// Newsletter original de Boty: mismos contenedores, jerarquía, espaciados y botón.
// El formulario simulado se sustituye por el canal real de contacto.
export function Contacto() {
  return (
    <section id="contacto" aria-labelledby="contacto-heading" className={`py-24 bg-primary ${identidad.ancla}`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <h2 id="contacto-heading" className="font-serif text-4xl leading-tight text-primary-foreground mb-4 text-balance md:text-7xl">
            Sigamos en contacto.
          </h2>
          <p className="text-lg text-primary-foreground/80 mb-10">
            Accesorios para acompañar tu estilo y detalles para regalar. También nos encontrás en ferias y eventos de la ciudad. Seguinos en {negocioPublico.usuarioInstagram} para conocer las novedades.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto justify-center">
            <a href={negocioPublico.instagram} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center justify-center gap-2 bg-primary-foreground text-primary px-8 py-4 rounded-full text-sm tracking-wide boty-transition hover:bg-primary-foreground/90">
              Ver Instagram
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 boty-transition" aria-hidden="true" />
            </a>
          </div>
          <p className="text-sm text-primary-foreground/60 mt-6">WhatsApp · canal pendiente de confirmar</p>
        </div>
      </div>
    </section>
  )
}
