import Image from "next/image"
import { negocioPublico } from "@/lib/negocio-publico"
import identidad from "@/components/publico/identidad.module.css"
import { MapPin, Clock, Wallet, Truck } from "lucide-react"

const features = [
  { icon: MapPin, title: "Ubicación", description: <>Entre Ríos 924<br />Planta baja, detrás de las escaleras</> },
  { icon: Clock, title: "Horarios", description: "Consultar horarios vigentes" },
  { icon: Wallet, title: "Medios de pago", description: <>Efectivo<br />Transferencia</> },
  { icon: Truck, title: "Envíos", description: <>Envíos en Concordia<br />A cargo del cliente</> },
]

export function FeatureSection() {
  return (
    <section id="el-local" aria-labelledby="local-heading" className={`py-16 lg:py-24 bg-background ${identidad.ancla}`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div
          className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-start"
        >
          {/* El encuadre acerca el acceso sin modificar la imagen original. */}
          <figure className="min-w-0 lg:h-full flex flex-col">
            <div
              className="relative aspect-[4/3] lg:aspect-auto lg:flex-1 lg:min-h-[36rem] rounded-3xl overflow-hidden boty-shadow"
            >
            <Image
              src="/images/local/entre-rios-924-street-view.png"
              alt="Fachada de Entre Ríos 924, Concordia: entrada central con puerta de hierro negro y número 924 a su derecha. Imagen de Google Street View con los controles retirados."
              fill
              sizes="(min-width: 1280px) 576px, (min-width: 1024px) calc((100vw - 128px) / 2), calc(100vw - 48px)"
              className="object-cover object-[52%_center]"
            />
            </div>
            <figcaption className="mt-3 text-xs text-muted-foreground">
              Acceso por la puerta central · Imagen de Google Street View
            </figcaption>
          </figure>

          {/* Content */}
          <div>
            <span className="text-sm tracking-[0.3em] uppercase text-primary mb-4 block">
              VENÍ A CONOCERNOS
            </span>
            <h2 id="local-heading" className="font-serif text-4xl leading-tight text-foreground mb-6 text-balance md:text-5xl xl:text-6xl">
              Un espacio para encontrar ese detalle especial.
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-md">
              Encontranos en Entre Ríos 924, planta baja, detrás de las escaleras, en Concordia.

            </p>

            {/* Feature Cards */}
            <div className="grid sm:grid-cols-2 gap-4">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="group p-5 boty-transition hover:scale-[1.02] rounded-md bg-white"
                >
                  {feature.title !== "Ubicación" && (
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full mb-3 group-hover:bg-primary/20 boty-transition bg-stone-50">
                      <feature.icon className="w-5 h-5 text-primary" aria-hidden="true" />
                    </div>
                  )}
                  <h3 className="font-medium text-foreground mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                  {feature.title === "Ubicación" && (
                    <a
                      href={negocioPublico.comoLlegar}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-full text-sm tracking-wide boty-transition hover:bg-primary/90 mt-4"
                    >
                      <MapPin className="w-4 h-4" aria-hidden="true" />
                      Cómo llegar
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
