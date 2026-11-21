import Image, { type StaticImageData } from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

export function Hero({ foto }: { foto?: StaticImageData }) {
  return (
    <section className="relative flex min-h-svh items-center overflow-hidden bg-[#e3e1e2] pb-36 pt-32 lg:min-h-screen lg:py-0" aria-labelledby="hero-heading">
      <div aria-hidden="true" className="absolute inset-0">
        {foto && <Image src={foto} alt="" fill preload sizes="100vw" className="object-cover object-[54%_center] md:object-[52%_center] lg:object-center" />}
        <span className="pointer-events-none absolute inset-0 hidden bg-[radial-gradient(ellipse_60%_90%_at_0%_48%,#fff8eaf5_0%,#fff8eae8_32%,#fff8ea99_61%,transparent_100%)] lg:block" />
        <div className="absolute inset-x-0 bottom-0 h-[18%] bg-linear-to-t from-card to-transparent" />
      </div>

      <div className="relative z-10 w-full lg:pt-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto w-full text-center lg:mx-0 lg:max-w-xl lg:text-left relative isolate">
            <div aria-hidden="true" className="pointer-events-none absolute -inset-x-20 -inset-y-24 -z-10 bg-[radial-gradient(ellipse_68%_50%_at_center,#fff8ea_0%,#fff8eae8_34%,#fff8ea99_58%,transparent_100%)] lg:hidden" />
            <span className="mb-6 block text-sm uppercase tracking-normal text-black">ANGEL TEARS · ACCESORIOS EN CONCORDIA</span>
            <h1 id="hero-heading" className="mb-6 text-balance font-serif text-[clamp(2.5rem,11vw,3.25rem)] font-semibold leading-[1.1] text-black md:text-6xl lg:text-7xl">
              Accesorios que acompañan cada versión de vos.
            </h1>
            <p className="mx-auto mb-10 max-w-md text-lg leading-relaxed text-black lg:mx-0">Descubrí aros, collares, pulseras y anillos para todos los días. Encontrá tus favoritos en nuestro catálogo.</p>
            <div className="flex justify-center lg:justify-start">
              <Link href="/catalogo" className="group inline-flex items-center justify-center gap-3 rounded-full bg-primary px-8 py-4 text-sm tracking-wide text-primary-foreground boty-transition boty-shadow hover:bg-primary/90">
                Ver catálogo<ArrowRight className="size-4 boty-transition group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <a href="#coleccion" aria-label="Bajar a la colección" className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-black">
        <span className="text-xs font-bold uppercase tracking-widest">Scroll</span>
        <span className="relative h-12 w-px overflow-hidden bg-foreground/20"><span className="absolute left-0 top-0 h-1/2 w-full animate-pulse bg-foreground/60" /></span>
      </a>
    </section>
  )
}
