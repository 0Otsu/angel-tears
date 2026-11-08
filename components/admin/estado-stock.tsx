import { CircleAlert, TriangleAlert } from "lucide-react"
import type { EstadoVisualStock } from "@/lib/presentacion/inventario"
import { cn } from "@/lib/utils"
import { EtiquetaEstado } from "./piezas-admin"

// Paleta compartida por indicadores, filas y badges. No define reglas de stock.
export const estilosEstadoStock = {
  sin_stock: {
    texto: "text-rose-900",
    indicador: "border-rose-200 bg-rose-50 text-rose-900 hover:bg-rose-100/70",
    cero: "border-rose-200/60 bg-rose-50/40 text-rose-900 hover:bg-rose-50",
    fila: "bg-rose-50/30 hover:bg-rose-50/60 [&>td:first-child]:border-l-2 [&>td:first-child]:border-l-rose-300",
    badge: "border-rose-200 bg-rose-50 text-rose-900",
    icono: CircleAlert,
    etiqueta: "Sin stock",
  },
  pocas: {
    texto: "text-amber-900",
    indicador: "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100/70",
    cero: "border-amber-200/60 bg-amber-50/40 text-amber-900 hover:bg-amber-50",
    fila: "bg-amber-50/30 hover:bg-amber-50/60 [&>td:first-child]:border-l-2 [&>td:first-child]:border-l-amber-300",
    badge: "border-amber-200 bg-amber-50 text-amber-900",
    icono: TriangleAlert,
    etiqueta: "Pocas unidades",
  },
  disponible: {
    texto: "", indicador: "", cero: "", fila: "", badge: "",
    icono: null, etiqueta: "Disponible",
  },
} as const

export function EstadoStock({ estado }: { estado: EstadoVisualStock }) {
  const estilo = estilosEstadoStock[estado]
  if (!estilo.icono) return <EtiquetaEstado tono="oliva">{estilo.etiqueta}</EtiquetaEstado>
  const Icono = estilo.icono
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium", estilo.badge)}><Icono className="size-3.5 shrink-0" aria-hidden="true" />{estilo.etiqueta}</span>
}
