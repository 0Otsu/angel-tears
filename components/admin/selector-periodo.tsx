"use client"

import { CalendarDays } from "lucide-react"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { periodosDemo, type PeriodoDemo } from "@/lib/mock/admin"

export function SelectorPeriodo({ valor, alCambiar }: { valor: PeriodoDemo; alCambiar: (valor: PeriodoDemo) => void }) {
  return <Select value={valor} onValueChange={valor => alCambiar(valor as PeriodoDemo)}><SelectTrigger aria-label="Período de muestra" className="h-10 w-full rounded-full border-border bg-background px-4 text-xs sm:w-56"><CalendarDays className="size-3.5 text-primary" aria-hidden="true" /><SelectValue /></SelectTrigger><SelectContent>{Object.entries(periodosDemo).map(([clave, periodo]) => <SelectItem key={clave} value={clave}>{periodo.nombre} · mock</SelectItem>)}</SelectContent></Select>
}
