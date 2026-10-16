"use client"

import { useEffect, useRef, useState } from "react"
import { negocioPublico } from "@/lib/negocio-publico"
import identidad from "@/components/publico/identidad.module.css"
import { MapPin, Clock, Wallet, Truck, ArrowRight } from "lucide-react"

const features = [
  { icon: MapPin, title: "Ubicación", description: <>Entre Ríos 924<br />Planta baja, detrás de las escaleras</> },
  { icon: Clock, title: "Horarios", description: "Consultar horarios vigentes" },
  { icon: Wallet, title: "Medios de pago", description: <>Efectivo<br />Transferencia</> },
  { icon: Truck, title: "Envíos", description: <>Envíos en Concordia<br />A cargo del cliente</> },
]

export function FeatureSection() {

  const [isVideoVisible, setIsVideoVisible] = useState(false)
  const [headerVisible, setHeaderVisible] = useState(false)

  const videoSectionRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {

    const videoObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVideoVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    const headerObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHeaderVisible(true)
        }
      },
      { threshold: 0.1 }
    )


    if (videoSectionRef.current) {
      videoObserver.observe(videoSectionRef.current)
    }

    if (headerRef.current) {
      headerObserver.observe(headerRef.current)
    }

    return () => {
      videoObserver.disconnect()
      headerObserver.disconnect()
    }
  }, [])

  return (
    <section id="el-local" aria-labelledby="local-heading" className={`py-24 bg-background ${identidad.ancla}`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div
          ref={videoSectionRef}
          className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center my-0 py-20"
        >
          {/* Video */}
          <div
            className={`relative aspect-[4/5] rounded-3xl overflow-hidden boty-shadow transition-all duration-700 ease-out ${
              isVideoVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
          >
            {/* Foto real del local pendiente: no usar capturas de Instagram ni imágenes inventadas. */}
            <div role="img" aria-label="Fotografía real del local pendiente de incorporar" className="absolute inset-0 bg-card" />
          </div>

          {/* Content */}
          <div
            ref={headerRef}
            className={`transition-all duration-700 ease-out ${
              isVideoVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ transitionDelay: '100ms' }}
          >
            <span className={`text-sm tracking-[0.3em] uppercase text-primary mb-4 block ${headerVisible ? 'animate-blur-in opacity-0' : 'opacity-0'}`} style={headerVisible ? { animationDelay: '0.2s', animationFillMode: 'forwards' } : {}}>
              VENÍ A CONOCERNOS
            </span>
            <h2 id="local-heading" className={`font-serif text-4xl leading-tight text-foreground mb-6 text-balance md:text-7xl ${headerVisible ? 'animate-blur-in opacity-0' : 'opacity-0'}`} style={headerVisible ? { animationDelay: '0.4s', animationFillMode: 'forwards' } : {}}>
              Un espacio para encontrar ese detalle especial.
            </h2>
            <p className={`text-lg text-muted-foreground leading-relaxed mb-10 max-w-md ${headerVisible ? 'animate-blur-in opacity-0' : 'opacity-0'}`} style={headerVisible ? { animationDelay: '0.6s', animationFillMode: 'forwards' } : {}}>
              Encontranos en Entre Ríos 924, planta baja, detrás de las escaleras, en Concordia.

            </p>

            {/* Feature Cards */}
            <div className="grid sm:grid-cols-2 gap-4">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="group p-5 boty-transition hover:scale-[1.02] rounded-md bg-white"
                >
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-full mb-3 group-hover:bg-primary/20 boty-transition bg-stone-50">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-medium text-foreground mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
            <a
              href={negocioPublico.comoLlegar}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center justify-center gap-3 bg-primary text-primary-foreground px-8 py-4 rounded-full text-sm tracking-wide boty-transition hover:bg-primary/90 boty-shadow mt-10"
            >
              Cómo llegar
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 boty-transition" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
