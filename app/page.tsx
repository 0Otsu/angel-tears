import { Header } from "@/components/boty/header"
import { Hero } from "@/components/boty/hero"
import { SeleccionHome } from "@/components/publico/seleccion-home"
import { FeatureSection } from "@/components/boty/feature-section"
import { Testimonials } from "@/components/boty/testimonials"
import { Contacto } from "@/components/boty/contacto"
import identidad from "@/components/publico/identidad.module.css"
import { Footer } from "@/components/boty/footer"

export const dynamic = "force-dynamic"

export default function HomePage() {
  return (
    <main className={identidad.sitio}>
      <Header />
      <Hero />
      <SeleccionHome />
      <FeatureSection />
      <Testimonials />
      <Contacto />
      <Footer />
    </main>
  )
}
