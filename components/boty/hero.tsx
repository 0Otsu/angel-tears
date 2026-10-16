import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

export function Hero() {
  return (
    <section className="relative flex min-h-svh items-center overflow-hidden bg-[#e3e1e2] pb-36 pt-32 lg:min-h-screen lg:py-0" aria-labelledby="hero-heading">
      {/* Placeholder de accesorios existente. Reemplazar por foto/video real de
          Angel Tears conservando este encuadre de fondo y la composición Boty. */}
      <div className="absolute inset-0">
        <Image src="/images/products/angel-tears-gold-jewelry.png" alt="" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-background via-background/50 to-transparent" />
      </div>

      <div className="relative z-10 w-full lg:pt-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto w-full text-center lg:mx-0 lg:max-w-xl lg:text-left">
            <span className="mb-6 block text-sm uppercase tracking-normal text-black">Bijouterie · Concordia, Entre Ríos</span>
            <h1 id="hero-heading" className="mb-6 text-balance font-serif text-5xl font-semibold leading-[1.1] text-black md:text-6xl lg:text-7xl">
              <span className="block">Pequeños detalles.</span>
              <span className="block text-[clamp(3.5rem,18.5vw,4.5rem)] sm:text-7xl xl:text-9xl">Tu estilo, siempre.</span>
            </h1>
            <p className="mx-auto mb-10 max-w-md text-lg leading-relaxed text-black lg:mx-0">Accesorios únicos para acompañar tu forma de ser.</p>
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
