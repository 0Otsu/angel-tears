import { obtenerNegocioPublico } from "@/lib/modulos/configuracion/aplicacion"
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
export async function generateMetadata() {
  const negocioPublico = await obtenerNegocioPublico()
  const titulo = negocioPublico ? `Bijouterie en ${negocioPublico.ciudad}` : "Bijouterie y accesorios"
  const descripcion = "Conocé los aros, collares, pulseras, anillos y otros accesorios de Angel Tears. Visitá nuestro local o consultanos por WhatsApp."
  return { ...metadataPublica(titulo, descripcion, "/"), title: { absolute: `${titulo} | Angel Tears` } }
}

export default async function HomePage() {
  const negocioPublico = await obtenerNegocioPublico()
  return (
    <main className={identidad.sitio}>
      {negocioPublico && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializarDatosEstructurados(datosLocal(negocioPublico)) }} />}
      <Header negocioPublico={negocioPublico} />
      <Hero />
      <SeleccionHome />
      <FeatureSection negocioPublico={negocioPublico} />
      <Testimonials negocioPublico={negocioPublico} />
      <Contacto negocioPublico={negocioPublico} />
      <Footer negocioPublico={negocioPublico} />
    </main>
  )
}
