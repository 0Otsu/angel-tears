import { Header } from "@/components/boty/header"
import { Hero } from "@/components/boty/hero"
import { ProductGrid } from "@/components/boty/product-grid"
import { FeatureSection } from "@/components/boty/feature-section"
import { Testimonials } from "@/components/boty/testimonials"
import { Contacto } from "@/components/boty/contacto"
import identidad from "@/components/publico/identidad.module.css"
import { Footer } from "@/components/boty/footer"

export default function HomePage() {
  return (
    <main className={identidad.sitio}>
      <Header />
      <Hero />
      <ProductGrid />
      <FeatureSection />
      <Testimonials />
      <Contacto />
      <Footer />
    </main>
  )
}
