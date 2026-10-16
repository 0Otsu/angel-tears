import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { Info } from "lucide-react"
import { cn } from "@/lib/utils"

export function PanelAdmin({ children, className, ...props }: React.ComponentProps<"section">) {
  return <section className={cn("min-w-0 rounded-2xl border border-border/60 bg-background boty-shadow", className)} {...props}>{children}</section>
}

export function TituloPanel({ titulo, detalle, accion }: { titulo: string; detalle?: string; accion?: ReactNode }) {
  return <div className="flex flex-wrap items-start justify-between gap-3 p-5 lg:p-6"><div><h2 className="text-base font-medium tracking-tight">{titulo}</h2>{detalle && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detalle}</p>}</div>{accion}</div>
}

export function TarjetaIndicador({ titulo, valor, nota, icono: Icono }: { titulo: string; valor: string; nota: string; icono: LucideIcon }) {
  return <PanelAdmin className="relative overflow-hidden p-4 lg:p-5"><div className="mb-5 flex items-center justify-between gap-2 lg:gap-3"><p className="text-xs font-medium text-muted-foreground">{titulo}</p><span className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-card text-primary lg:size-9"><Icono className="size-3.5 lg:size-4" aria-hidden="true" /></span></div><p className="text-xl font-medium tracking-tight tabular-nums md:text-2xl xl:text-3xl">{valor}</p><p className="mt-2 text-[10px] leading-relaxed text-muted-foreground lg:text-xs">{nota}</p></PanelAdmin>
}

export function EncabezadoAdmin({ titulo, descripcion, children }: { titulo: string; descripcion: string; children?: ReactNode }) {
  return <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="mb-2 text-[10px] uppercase tracking-[0.22em] text-primary">Angel Tears · Administración</p><h1 className="font-serif text-3xl leading-tight lg:text-4xl">{titulo}</h1><p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{descripcion}</p></div>{children}</div>
}

export function EtiquetaEstado({ children, tono = "neutro" }: { children: ReactNode; tono?: "oliva" | "alerta" | "neutro" }) {
  return <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium", tono === "oliva" ? "bg-primary/10 text-primary" : tono === "alerta" ? "bg-destructive/10 text-destructive" : "bg-card text-muted-foreground")}><span className="size-1.5 rounded-full bg-current" aria-hidden="true" />{children}</span>
}

export function AvisoDemo() {
  return <div className="flex items-start gap-2.5 rounded-xl border border-border/70 bg-card/40 px-4 py-3 text-xs leading-relaxed text-muted-foreground"><Info className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" /><p><span className="font-medium text-foreground">DATOS DE DEMOSTRACIÓN</span> No hay autenticación, guardado ni operaciones reales.</p></div>
}
