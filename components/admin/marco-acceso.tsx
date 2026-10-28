import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

// Composicion clara compartida por login, recuperar y restablecer contrasena.
export function MarcoAcceso({
  titulo,
  descripcion,
  children,
}: {
  titulo: string
  descripcion: string
  children: ReactNode
}) {
  return (
    <main className="grid min-h-svh bg-background lg:grid-cols-[44%_56%]">
      <aside
        className="relative hidden overflow-hidden bg-card lg:order-2 lg:block"
        aria-label="Identidad de Angel Tears"
      >
        <Image
          src="/images/admin/casa-login.jpg"
          alt=""
          fill
          sizes="56vw"
          className="object-cover object-[50%_65%]"
          priority
        />
      </aside>

      <section className="flex min-h-svh flex-col px-6 py-6 sm:px-10 lg:order-1 lg:px-12 lg:py-10">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 rounded-full text-sm text-muted-foreground boty-transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver al sitio
        </Link>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10 sm:py-14 lg:py-8">
          <Link
            href="/"
            className="mb-10 w-fit rounded-sm font-serif text-3xl tracking-wider text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background"
          >
            Angel Tears
          </Link>
          <p className="mb-3 text-xs uppercase tracking-[0.3em] text-primary">Espacio de la administradora</p>
          <h1 className="mb-3 font-serif text-3xl leading-tight text-foreground sm:text-4xl">{titulo}</h1>
          <p className="mb-8 text-sm leading-relaxed text-muted-foreground">{descripcion}</p>
          {children}
        </div>

        <p className="text-xs text-muted-foreground">Angel Tears · Administración</p>
      </section>
    </main>
  )
}
