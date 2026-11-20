import Link from "next/link"
import { Instagram, MessageCircle } from "lucide-react"
import type { ProductoPublico } from "@/lib/modulos/catalogo/contrato"
import { formatearPrecioPublico as formatPrice } from "@/lib/modulos/catalogo/presentacion"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import type { NegocioPublico } from "@/lib/negocio-publico"
import { GaleriaPublica } from "./galeria-publica"
import estilos from "./vista-detalle-producto.module.css"

type PropiedadesInformacion = {
  product: ProductoPublico
  nivelTitulo: "h1" | "h2"
  enlacesEnOtraPestana: boolean
  enlaceWhatsApp?: string
  negocioPublico?: NegocioPublico
}

function InformacionProducto({ product, nivelTitulo, enlacesEnOtraPestana, enlaceWhatsApp, negocioPublico }: PropiedadesInformacion) {
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

      <div className={`mb-9 gap-3 ${enlacesEnOtraPestana ? "flex flex-col" : "grid auto-rows-fr"}`}>
        {enlaceWhatsApp && (
          <a
            href={enlaceWhatsApp}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Consultar por WhatsApp (abre otra pestaña)"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#146c43] px-8 py-4 text-center text-sm tracking-wide text-white boty-shadow boty-transition hover:bg-[#105735] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#146c43] focus-visible:ring-offset-2"
          >
            <MessageCircle className="size-4 shrink-0" aria-hidden="true" />
            Consultar por WhatsApp
          </a>
        )}
        <div className={enlacesEnOtraPestana ? "flex flex-col gap-3 sm:flex-row" : "contents"}>
          {negocioPublico && <a
            href={negocioPublico.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full px-8 py-4 text-center text-sm tracking-wide boty-transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${enlaceWhatsApp ? "border border-border bg-card text-foreground hover:bg-accent" : "bg-primary text-primary-foreground boty-shadow hover:bg-primary/90"}`}
          >
            <span className={enlaceWhatsApp ? "grid size-6 shrink-0 place-items-center rounded-md bg-linear-to-tr from-[#a14116] via-[#a52364] to-[#6543a3] text-white" : undefined}>
              <Instagram className="size-4 shrink-0" aria-hidden="true" />
            </span>
            Consultar por Instagram
          </a>}
          <Link prefetch={false}
            href="/catalogo"
            target={enlacesEnOtraPestana ? "_blank" : undefined}
            rel={enlacesEnOtraPestana ? "noopener noreferrer" : undefined}
            aria-label={enlacesEnOtraPestana ? "Volver al catálogo (abre otra pestaña)" : undefined}
            className="inline-flex flex-1 items-center justify-center rounded-full border border-foreground/20 px-8 py-4 text-center text-sm tracking-wide text-foreground boty-transition hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Volver al catálogo
          </Link>
        </div>
      </div>

      <Accordion type="single" collapsible defaultValue="details" className="border-t border-border/50">
        {(product.material || product.medida || product.color) && <AccordionItem value="details" className="border-border/50">
          <AccordionTrigger>Detalles del producto</AccordionTrigger>
          <AccordionContent><dl className="space-y-2 text-muted-foreground">{[["Material", product.material], ["Medida", product.medida], ["Color", product.color]].filter(([, valor]) => valor).map(([etiqueta, valor]) => <div key={etiqueta}><dt className="inline font-medium">{etiqueta}: </dt><dd className="inline">{valor}</dd></div>)}</dl></AccordionContent>
        </AccordionItem>}
        <AccordionItem value="delivery" className="border-border/50">
          <AccordionTrigger>Formas de entrega</AccordionTrigger>
          <AccordionContent><p className="leading-relaxed text-muted-foreground">{negocioPublico && `Podés visitarnos en ${[negocioPublico.direccion, negocioPublico.referencia, negocioPublico.ciudad].filter(Boolean).join(", ")}. `}Realizamos envíos en Concordia a cargo del cliente.{negocioPublico && " Consultanos por Instagram para coordinar."}</p></AccordionContent>
        </AccordionItem>
        {product.cuidados && <AccordionItem value="care" className="border-border/50">
          <AccordionTrigger>Cuidados</AccordionTrigger>
          <AccordionContent><p className="leading-relaxed text-muted-foreground">{product.cuidados}</p></AccordionContent>
        </AccordionItem>}
        <AccordionItem value="availability" className="border-border/50">
          <AccordionTrigger>Consulta y disponibilidad</AccordionTrigger>
          <AccordionContent><p className="leading-relaxed text-muted-foreground">{negocioPublico ? `${enlaceWhatsApp ? "Escribinos por WhatsApp o Instagram" : `Escribinos a ${negocioPublico.usuarioInstagram}`} para confirmar disponibilidad y consultar por esta pieza.` : "Los canales de contacto no están disponibles en este momento."}</p></AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}

// Presentacion compartida: sin consultas, permisos, metadata ni estado administrativo.
export function VistaDetalleProducto({ product, nivelTitulo = "h1", enlacesEnOtraPestana = false, sizesImagen, enlaceWhatsApp, negocioPublico }: {
  product: ProductoPublico
  nivelTitulo?: "h1" | "h2"
  enlacesEnOtraPestana?: boolean
  sizesImagen?: string
  enlaceWhatsApp?: string
  negocioPublico?: NegocioPublico
}) {
  return <section aria-label="Detalle del producto" className={estilos.contenedor}><div className={estilos.detalle}>
    <GaleriaPublica principal={product.imagen} medios={product.galeria} sizes={sizesImagen} />
    <InformacionProducto product={product} nivelTitulo={nivelTitulo} enlacesEnOtraPestana={enlacesEnOtraPestana} enlaceWhatsApp={enlaceWhatsApp} negocioPublico={negocioPublico} />
  </div></section>
}
