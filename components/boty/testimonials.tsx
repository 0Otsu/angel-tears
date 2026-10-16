"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { historiasSociales, type SocialItem } from "@/lib/mock/historias-sociales"
import { negocioPublico } from "@/lib/negocio-publico"

// Sustituye únicamente el contenido de TestimonialCard por el medio real.
// Sin citas, estrellas, nombres ni etiquetas añadidas. Se conserva su radio Boty.
function TestimonialCard({ item }: { item: SocialItem }) {
  return (
    <figure className="relative mx-auto aspect-[9/16] w-full max-w-[337.5px] snap-start overflow-hidden rounded-3xl">
      {item.type === "image" ? (
        <Image src={item.src} alt={item.alt} fill sizes="(min-width: 768px) 338px, 86vw" className="object-contain" />
      ) : (
        <video src={item.src} aria-label={item.alt} controls playsInline preload="metadata" className="absolute inset-0 h-full w-full object-contain" />
      )}
    </figure>
  )
}

export function Testimonials() {
  const [headerVisible, setHeaderVisible] = useState(false)
  const [current, setCurrent] = useState(0)
  const headerRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)

  // Entrada original de Testimonials / Loved by thousands de Boty.
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setHeaderVisible(true)
    }, { threshold: 0.1 })
    const header = headerRef.current
    if (header) observer.observe(header)
    return () => observer.disconnect()
  }, [])

  function goTo(index: number) {
    const viewport = viewportRef.current
    if (!viewport) return
    const next = Math.max(0, Math.min(index, historiasSociales.length - 1))
    const item = viewport.children[next] as HTMLElement | undefined
    if (!item) return
    const left = item.getBoundingClientRect().left - viewport.getBoundingClientRect().left + viewport.scrollLeft
    viewport.scrollTo({ left, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })
  }

  function updateCurrent() {
    const viewport = viewportRef.current
    if (!viewport) return
    // El último elemento no puede alinearse al inicio porque no agregamos espacio
    // vacío al final; detectar el extremo permite deshabilitar Siguiente también.
    if (viewport.scrollLeft + viewport.clientWidth >= viewport.scrollWidth - 2) {
      setCurrent(historiasSociales.length - 1)
      return
    }
    const left = viewport.getBoundingClientRect().left
    let nearest = 0
    let distance = Infinity
    Array.from(viewport.children).forEach((item, index) => {
      const delta = Math.abs(item.getBoundingClientRect().left - left)
      if (delta < distance) { distance = delta; nearest = index }
    })
    setCurrent(nearest)
  }

  return (
    <section id="de-ustedes" aria-labelledby="social-heading" className="py-24 bg-background overflow-hidden pb-24 pt-12 scroll-mt-[120px]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div ref={headerRef} className="text-center mb-16">
          <span className={`text-sm tracking-[0.3em] uppercase text-primary mb-4 block ${headerVisible ? 'animate-blur-in opacity-0' : 'opacity-0'}`} style={headerVisible ? { animationDelay: '0.2s', animationFillMode: 'forwards' } : {}}>
            DE USTEDES
          </span>
          <h2 id="social-heading" className={`font-serif text-4xl leading-tight text-foreground text-balance md:text-7xl ${headerVisible ? 'animate-blur-in opacity-0' : 'opacity-0'}`} style={headerVisible ? { animationDelay: '0.4s', animationFillMode: 'forwards' } : {}}>
            Detalles que encuentran su persona.
          </h2>
        </div>

        {/* Misma área de tres columnas y 600 px del original. En móvil, el scroll
            manual horizontal sustituye el bucle vertical y deja asomar la siguiente. */}
        <div className="relative">
          <div
            id="historias-sociales"
            ref={viewportRef}
            role="region"
            aria-label="Historias reales de Angel Tears; usá las flechas para recorrerlas"
            aria-roledescription="carrusel"
            tabIndex={0}
            onScroll={updateCurrent}
            onKeyDown={event => {
              if (event.target !== event.currentTarget) return
              if (event.key === "ArrowRight" || event.key === "ArrowLeft" || event.key === "Home" || event.key === "End") {
                event.preventDefault()
                goTo(event.key === "Home" ? 0 : event.key === "End" ? historiasSociales.length - 1 : current + (event.key === "ArrowRight" ? 1 : -1))
              }
            }}
            className="grid grid-flow-col auto-cols-[86%] gap-4 overflow-x-auto overscroll-x-contain snap-x snap-mandatory md:h-[600px] md:grid-flow-row md:auto-cols-auto md:grid-cols-3 md:items-center md:overflow-visible"
          >
            {historiasSociales.map(item => <TestimonialCard key={item.src} item={item} />)}
          </div>
          <div className="mt-6 flex items-center justify-center gap-4 md:hidden">
            <Button type="button" variant="ghost" size="icon" className="rounded-full" aria-label="Historia anterior" aria-controls="historias-sociales" disabled={current === 0} onClick={() => goTo(current - 1)}><ArrowLeft aria-hidden="true" /></Button>
            <span aria-live="polite" aria-atomic="true" className="text-xs text-muted-foreground">Historia {current + 1} de {historiasSociales.length}</span>
            <Button type="button" variant="ghost" size="icon" className="rounded-full" aria-label="Historia siguiente" aria-controls="historias-sociales" disabled={current === historiasSociales.length - 1} onClick={() => goTo(current + 1)}><ArrowRight aria-hidden="true" /></Button>
          </div>
        </div>
        <div className="text-center mt-12">
          <a href={negocioPublico.instagram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 bg-transparent border border-foreground/20 text-foreground px-8 py-4 rounded-full text-sm tracking-wide boty-transition hover:bg-foreground/5">Ver más en {negocioPublico.usuarioInstagram}</a>
        </div>
      </div>
    </section>
  )
}
