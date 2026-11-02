"use client"

import { useState } from "react"
import { PendingButton } from "@/components/ui/pending-button"
import Link from "next/link"
import { Header } from "@/components/boty/header"
import { Footer } from "@/components/boty/footer"
import identidad from "./identidad.module.css"

export function ErrorDatosPublicos({ reintentar }: { reintentar: () => void }) {
  const [pendiente, esperar] = useState(false)
  return <main className={`min-h-screen ${identidad.sitio}`}>
    <Header />
    <section className="mx-auto max-w-3xl px-6 pb-24 pt-40">
      <h1 className="mb-6 font-serif text-4xl">No pudimos cargar los productos</h1>
      <p role="alert" className="mb-6 text-muted-foreground">Ocurrió un problema al consultar la información. Intentá nuevamente.</p>
      <PendingButton pending={pendiente} pendingLabel="Reintentando…" onClick={() => { if (!pendiente) { esperar(true); reintentar() } }} className="rounded-full px-6 py-3">Reintentar</PendingButton>
      <Link href="/" className="ml-6 underline">Volver al inicio</Link>
    </section>
    <Footer />
  </main>
}
