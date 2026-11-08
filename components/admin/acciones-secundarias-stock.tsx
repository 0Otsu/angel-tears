"use client"
import { useState } from "react"
import { MoreVertical } from "lucide-react"
import type { FilaStock } from "@/lib/modulos/inventario/administracion-contrato"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { DialogoHistorialStock } from "./dialogo-historial-stock"

export function AccionesSecundariasStock({fila}: {fila:FilaStock}) {
  const [abierto,abrir]=useState(false)
  const cerrar=()=>abrir(false)
  return <DropdownMenu open={abierto} onOpenChange={abrir}>
    <DropdownMenuTrigger asChild><Button variant="outline" className="size-11 shrink-0 p-0" aria-label={`Más acciones de ${fila.nombre}`}><MoreVertical aria-hidden="true" /></Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DialogoHistorialStock fila={fila} alCerrar={cerrar} disparador={<DropdownMenuItem className="min-h-11" onSelect={e=>e.preventDefault()}>Historial</DropdownMenuItem>} />
    </DropdownMenuContent>
  </DropdownMenu>
}
