import Link from "next/link"
import { Instagram } from "lucide-react"
import type { ProductoPublico } from "@/lib/modulos/catalogo/contrato"
import { formatearPrecioPublico as formatPrice } from "@/lib/modulos/catalogo/presentacion"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { negocioPublico } from "@/lib/negocio-publico"
import { GaleriaPublica } from "./galeria-publica"
import estilos from "./vista-detalle-producto.module.css"

function InformacionProducto({ product, nivelTitulo, enlacesEnOtraPestana }: { product: ProductoPublico; nivelTitulo: "h1" | "h2"; enlacesEnOtraPestana: boolean }) {
  const Titulo = nivelTitulo
  return (
    <div className="flex min-w-0 flex-col [overflow-wrap:anywhere]">
      <div className="mb-8">
        <p className="mb-3 text-sm uppercase tracking-[0.3em] text-primary">{product.categoriaNombre}</p>
        <Titulo className="mb-4 font-serif text-4xl leading-tight text-foreground md:text-5xl">{product.nombre}</Titulo>
        {product.descripcion && <p className="leading-relaxed text-foreground/80">{product.descripcion}</p>}
      </div>

      <div className="mb-7 flex flex-wrap items-center gap-4">
        <p className="min-w-0 max-w-full text-3xl font-medium text-foreground">{formatPrice(product.precio)}</p>
        <span className="rounded-full bg-card px-3 py-1 text-xs text-foreground">{product.disponible ? "Disponible" : "Sin stock"}</span>
      </div>

      <div className="mb-9 flex flex-col gap-3 sm:flex-row">
        <a
          href={negocioPublico.instagram}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-sm tracking-wide text-primary-foreground boty-shadow boty-transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Instagram className="size-4" aria-hidden="true" />
          Consultar por Instagram
        </a>
        <Link prefetch={false}
          href="/catalogo"
          target={enlacesEnOtraPestana ? "_blank" : undefined}
          rel={enlacesEnOtraPestana ? "noopener noreferrer" : undefined}
          aria-label={enlacesEnOtraPestana ? "Volver al catálogo (abre otra pestaña)" : undefined}
          className="inline-flex flex-1 items-center justify-center rounded-full border border-foreground/20 px-8 py-4 text-sm tracking-wide text-foreground boty-transition hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Volver al catálogo
        </Link>
      </div>

      <Accordion type="single" collapsible defaultValue="details" className="border-t border-border/50">
        {(product.material || product.medida || product.color) && <AccordionItem value="details" className="border-border/50">
          <AccordionTrigger>Detalles del producto</AccordionTrigger>
          <AccordionContent><dl className="space-y-2 text-muted-foreground">{[["Material", product.material], ["Medida", product.medida], ["Color", product.color]].filter(([, valor]) => valor).map(([etiqueta, valor]) => <div key={etiqueta}><dt className="inline font-medium">{etiqueta}: </dt><dd className="inline">{valor}</dd></div>)}</dl></AccordionContent>
        </AccordionItem>}
        <AccordionItem value="delivery" className="border-border/50">
          <AccordionTrigger>Formas de entrega</AccordionTrigger>
          <AccordionContent><p className="leading-relaxed text-muted-foreground">Podés visitarnos en Entre Ríos 924, planta baja, detrás de las escaleras, en Concordia. Realizamos envíos en Concordia a cargo del cliente. Consultanos por Instagram para coordinar.</p></AccordionContent>
        </AccordionItem>
        {product.cuidados && <AccordionItem value="care" className="border-border/50">
          <AccordionTrigger>Cuidados</AccordionTrigger>
          <AccordionContent><p className="leading-relaxed text-muted-foreground">{product.cuidados}</p></AccordionContent>
        </AccordionItem>}
        <AccordionItem value="availability" className="border-border/50">
          <AccordionTrigger>Consulta y disponibilidad</AccordionTrigger>
          <AccordionContent><p className="leading-relaxed text-muted-foreground">Escribinos a {negocioPublico.usuarioInstagram} para confirmar disponibilidad y consultar por esta pieza.</p></AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}

// Presentacion compartida: sin consultas, permisos, metadata ni estado administrativo.
export function VistaDetalleProducto({ product, nivelTitulo = "h1", enlacesEnOtraPestana = false, sizesImagen }: { product: ProductoPublico; nivelTitulo?: "h1" | "h2"; enlacesEnOtraPestana?: boolean; sizesImagen?: string }) {
  return <section aria-label="Detalle del producto" className={estilos.contenedor}><div className={estilos.detalle}>
    <GaleriaPublica principal={product.imagen} medios={product.galeria} sizes={sizesImagen} />
    <InformacionProducto product={product} nivelTitulo={nivelTitulo} enlacesEnOtraPestana={enlacesEnOtraPestana} />
  </div></section>
}
