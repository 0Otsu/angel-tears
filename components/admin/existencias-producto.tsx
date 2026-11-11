"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import type { FilaStock } from "@/lib/modulos/inventario/administracion-contrato"
import { estadoVisualStock } from "@/lib/presentacion/inventario"
import { Button } from "@/components/ui/button"
import { PanelAdmin } from "./piezas-admin"
import { EstadoStock } from "./estado-stock"
import { DialogoAjusteStock } from "./dialogo-ajuste-stock"
import { DialogoHistorialStock } from "./dialogo-historial-stock"
import { AvisoProductoGuardado } from "./aviso-producto-guardado"

export function ExistenciasProducto({ fila }: { fila: FilaStock | null }) {
  const router = useRouter()
  const [confirmacion, confirmar] = useState<{ base: FilaStock; saldo: number } | null>(null)
  const [aviso, avisar] = useState<{ texto: string; numero: number } | null>(null)
  // Solo el saldo confirmado por la Action sustituye temporalmente la lectura.
  // Una nueva lectura RSC siempre toma precedencia sobre esa confirmacion local.
  const saldo = fila && confirmacion?.base === fila ? confirmacion.saldo : fila?.saldo
  const actual = fila && saldo !== undefined ? { ...fila, saldo } : null
  return <PanelAdmin id="existencias" aria-labelledby="titulo-existencias" className="scroll-mt-24 space-y-4 p-4 sm:p-5">
    <h2 id="titulo-existencias" className="font-serif text-2xl">Existencias</h2>
    {aviso && <AvisoProductoGuardado key={aviso.numero} texto={aviso.texto} />}
    {!actual ? <div className="space-y-3"><p role="alert" className="text-sm">No pudimos consultar las existencias.</p><Button variant="outline" onClick={() => router.refresh()}>Reintentar consulta</Button></div> : <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3"><p><strong className="text-3xl font-medium tabular-nums">{actual.saldo}</strong><span className="ml-2 text-sm text-muted-foreground">unidades</span></p><EstadoStock estado={estadoVisualStock(actual.saldo)} /></div>
        <div className="flex flex-wrap gap-2"><DialogoAjusteStock fila={actual} alGuardar={(texto, saldoResultante) => { confirmar({ base: fila!, saldo: saldoResultante }); avisar(prev => ({ texto, numero: (prev?.numero ?? 0) + 1 })) }} /><DialogoHistorialStock fila={actual} /></div>
      </div>
      <p className="text-xs text-muted-foreground">Los ajustes se guardan por separado de los datos del producto.</p>
    </>}
  </PanelAdmin>
}
