"use client"

import { useState, type ReactNode } from "react"
import { Search, MoreHorizontal, Eye, SearchX } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { PanelAdmin, TituloPanel } from "./piezas-admin"

export type FilaDemo = { id: string; buscar: string; estado?: string; celdas: ReactNode[]; detalle: { nombre: string; valor: string }[] }

export function TablaDemo({ titulo, descripcion, columnas, filas, compacta = false, accion }: { titulo: string; descripcion: string; columnas: string[]; filas: FilaDemo[]; compacta?: boolean; accion?: ReactNode }) {
  const [consulta, setConsulta] = useState("")
  const [filtro, setFiltro] = useState("Todos")
  const [seleccion, setSeleccion] = useState<FilaDemo | null>(null)
  const estados = [...new Set(filas.map(f => f.estado).filter((e): e is string => Boolean(e)))]
  const visibles = filas.filter(fila => fila.buscar.toLocaleLowerCase("es").includes(consulta.toLocaleLowerCase("es")) && (filtro === "Todos" || fila.estado === filtro))
  return <PanelAdmin className="overflow-hidden">
    <TituloPanel titulo={titulo} detalle={descripcion} accion={accion} />
    {!compacta && <div className="flex flex-wrap gap-3 border-y border-border/60 bg-card/20 px-5 py-4">
      <div className="relative min-w-0 flex-1 basis-48"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" aria-hidden="true" /><Input aria-label={`Buscar en ${titulo}`} placeholder="Buscar en datos mock…" value={consulta} onChange={e => setConsulta(e.target.value)} className="h-10 rounded-xl border-border bg-background pl-10 shadow-none" /></div>
      {estados.length > 1 && <Select value={filtro} onValueChange={setFiltro}><SelectTrigger aria-label="Filtrar estado mock" className="h-10 min-w-40 rounded-xl border-border bg-background"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Todos">Todos los estados</SelectItem>{estados.map(estado => <SelectItem key={estado} value={estado}>{estado}</SelectItem>)}</SelectContent></Select>}
    </div>}
    {visibles.length ? <Table aria-label={`${titulo} · datos mock`}>
      <TableHeader><TableRow className="bg-card/25 hover:bg-card/25">{columnas.map(nombre => <TableHead key={nombre} className="h-11 px-5 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{nombre}</TableHead>)}<TableHead className="w-14 px-3"><span className="sr-only">Detalle</span></TableHead></TableRow></TableHeader>
      <TableBody>{visibles.map(fila => <TableRow key={fila.id} className="border-border/50 hover:bg-card/25">{fila.celdas.map((celda, i) => <TableCell key={i} className="px-5 py-4 text-xs">{celda}</TableCell>)}<TableCell className="px-3"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-9 rounded-lg" aria-label={`Opciones de ${fila.id}`}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => setSeleccion(fila)}><Eye className="size-4" />Ver detalle mock</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell></TableRow>)}</TableBody>
    </Table> : <Empty className="py-14"><EmptyHeader><EmptyMedia variant="icon"><SearchX /></EmptyMedia><EmptyTitle>Sin coincidencias</EmptyTitle><EmptyDescription>Probá otra búsqueda o quitá el filtro. Solo se consulta la muestra local.</EmptyDescription></EmptyHeader><Button variant="outline" onClick={() => { setConsulta(""); setFiltro("Todos") }}>Restablecer filtros</Button></Empty>}
    <div className="flex justify-between gap-3 border-t border-border/60 px-5 py-3 text-[10px] text-muted-foreground"><span>{visibles.length} de {filas.length} registros mock</span><span>Solo lectura · sin guardado</span></div>
    <Dialog open={Boolean(seleccion)} onOpenChange={abierto => { if (!abierto) setSeleccion(null) }}>
      <DialogContent showCloseButton={false} className="rounded-2xl border-border bg-background">
        <DialogHeader><DialogTitle>Detalle de muestra · {seleccion?.id}</DialogTitle><DialogDescription>Vista mock de solo lectura. Los campos y su diseño requieren validación con la SRS.</DialogDescription></DialogHeader>
        <dl className="divide-y divide-border">{seleccion?.detalle.map(campo => <div key={campo.nombre} className="flex flex-wrap justify-between gap-3 py-3 text-sm"><dt className="text-muted-foreground">{campo.nombre}</dt><dd className="max-w-full break-words text-right font-medium">{campo.valor}</dd></div>)}</dl>
        <DialogClose asChild><Button variant="outline" className="rounded-full">Cerrar detalle</Button></DialogClose>
      </DialogContent>
    </Dialog>
  </PanelAdmin>
}
