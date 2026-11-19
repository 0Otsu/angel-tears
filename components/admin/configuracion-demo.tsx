"use client"
import { Settings } from "lucide-react"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { EncabezadoAdmin, AvisoDemo, PanelAdmin, EtiquetaEstado } from "./piezas-admin"

export function ConfiguracionDemo() {
  return (
    <>
      <EncabezadoAdmin titulo="Configuración" descripcion="Un espacio reservado para las decisiones que tome el equipo." />
      <AvisoDemo />
      <PanelAdmin className="flex min-h-[420px] items-center justify-center">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Settings /></EmptyMedia>
            <EtiquetaEstado>Pendiente</EtiquetaEstado>
            <EmptyTitle>Prototipo pendiente de definición</EmptyTitle>
            <EmptyDescription>
              No hay configuraciones validadas para mostrar. No se incorporaron campos, preferencias ni perfiles adicionales.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </PanelAdmin>
    </>
  )
}
