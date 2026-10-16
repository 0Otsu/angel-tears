import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { FormularioLogin } from "@/components/admin/formulario-login"

export const metadata: Metadata = {
  title: "Panel de administración",
  robots: { index: false, follow: false },
}

export default function PaginaLogin() {
  return (
    <main className="grid min-h-svh bg-background lg:grid-cols-2">
      <aside
        className="relative m-5 hidden overflow-hidden rounded-3xl bg-card boty-shadow lg:block"
        aria-label="Identidad de Angel Tears"
      >
        <Image
          src="/images/products/angel-tears-gold-jewelry.png"
          alt=""
          fill
          sizes="50vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-10 xl:p-14">
          <p className="mb-5 text-xs uppercase tracking-[0.3em] text-primary">
            Bijouterie · Accesorios
          </p>
          <p className="font-serif text-4xl leading-tight text-foreground xl:text-5xl">
            Pequeños detalles.
            <br />
            Tu estilo, siempre.
          </p>
        </div>
      </aside>

      <section className="flex min-h-svh flex-col px-6 py-6 sm:px-10 lg:px-12 lg:py-10 xl:px-20">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 rounded-full text-sm text-muted-foreground boty-transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver al sitio
        </Link>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10 sm:py-14">
          <Link
            href="/"
            className="mb-10 w-fit rounded-sm font-serif text-3xl tracking-wider text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background"
          >
            Angel Tears
          </Link>
          <p className="mb-3 text-xs uppercase tracking-[0.3em] text-primary">
            Espacio de la administradora
          </p>
          <h1 className="mb-3 font-serif text-3xl leading-tight text-foreground sm:text-4xl">
            Panel de administración
          </h1>
          <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
            Ingresá tus datos para continuar.
          </p>
          <FormularioLogin />
          <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
            Vista previa visual. Ingresar abre el panel sin autenticación.
          </p>
        </div>

        <p className="text-xs text-muted-foreground">Angel Tears · Administración</p>
      </section>
    </main>
  )
}
