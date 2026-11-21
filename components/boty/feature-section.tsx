import Image, { type StaticImageData } from "next/image"
import { describirDias, describirFranjas, type NegocioPublico } from "@/lib/negocio-publico"
import identidad from "@/components/publico/identidad.module.css"
import { MapPin, Clock, Wallet, Truck } from "lucide-react"

export function FeatureSection({ negocioPublico, fotoLocal }: {
  negocioPublico?: NegocioPublico
  fotoLocal?: { src: StaticImageData; alt: string }
}) {
  const features = [
    { icon: MapPin, title: "Ubicación", description: negocioPublico
      ? <>{negocioPublico.direccion}<br />{negocioPublico.referencia && <>{negocioPublico.referencia}<br /></>}{negocioPublico.ciudad}</>
      : "Ubicación no disponible por el momento." },
    { icon: Clock, title: "Horarios", description: negocioPublico
      ? negocioPublico.gruposHorarios.map(({ dias, franjas }) =>
        <span key={dias[0]} className="block">{describirDias(dias)}: {describirFranjas(franjas)}</span>,
      )
      : "Horarios no disponibles por el momento." },
    { icon: Wallet, title: "Medios de pago", description: <>Efectivo<br />Transferencia</> },
    { icon: Truck, title: "Envíos", description: <>Envíos en Concordia<br />A cargo del cliente</> },
  ]

  return (
    <section id="el-local" aria-labelledby="local-heading" className={`py-16 lg:py-24 bg-background ${identidad.ancla}`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div className="min-w-0">
            <span className="text-sm tracking-[0.3em] uppercase text-primary mb-4 block">
              VENÍ A CONOCERNOS
            </span>
            <h2 id="local-heading" className="font-serif text-4xl leading-tight text-foreground mb-6 text-balance md:text-5xl xl:text-6xl">
              Vení a conocer Angel Tears
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-md">
              {negocioPublico && `Estamos en ${negocioPublico.ciudad}. `}Conocé nuestro espacio y encontrá cómo visitarnos.
            </p>
            {fotoLocal && (
              <Image
                src={fotoLocal.src}
                alt={fotoLocal.alt}
                sizes="(min-width: 1280px) 576px, (min-width: 1024px) calc((100vw - 128px) / 2), calc(100vw - 48px)"
                className="mt-6 aspect-[4/3] w-full rounded-3xl object-cover object-[50%_73%] boty-shadow"
              />
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group min-w-0 p-5 boty-transition hover:scale-[1.02] rounded-md bg-white"
              >
                {feature.title !== "Ubicación" && (
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-full mb-3 group-hover:bg-primary/20 boty-transition bg-stone-50">
                    <feature.icon className="w-5 h-5 text-primary" aria-hidden="true" />
                  </div>
                )}
                <h3 className="font-medium text-foreground mb-1">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
                {feature.title === "Ubicación" && negocioPublico && (
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
    </section>
  )
}
