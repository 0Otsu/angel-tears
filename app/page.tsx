import { Header } from "@/components/boty/header"
import { Hero } from "@/components/boty/hero"
import { SeleccionHome } from "@/components/publico/seleccion-home"
import { FeatureSection } from "@/components/boty/feature-section"
import { Testimonials } from "@/components/boty/testimonials"
import { Contacto } from "@/components/boty/contacto"
import identidad from "@/components/publico/identidad.module.css"
import { Footer } from "@/components/boty/footer"
import { metadataPublica } from "@/lib/modulos/catalogo/metadata-publica"
import { datosLocal, serializarDatosEstructurados } from "@/lib/modulos/catalogo/datos-estructurados"

export const dynamic = "force-dynamic"
export function generateMetadata() { return { ...metadataPublica("Bijouterie en Concordia, Entre Ríos", "Conocé los aros, collares, pulseras, anillos y otros accesorios de Angel Tears. Visitá nuestro local en Concordia, Entre Ríos, o consultanos por WhatsApp.", "/"), title: { absolute: "Bijouterie en Concordia, Entre Ríos | Angel Tears" } } }

export default function HomePage() {
  return (
    <main className={identidad.sitio}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializarDatosEstructurados(datosLocal()) }} />
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
