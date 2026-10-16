"use client"

import { Settings } from "lucide-react"
import { proveedoresDemo, comprasDemo, ventasDemo, egresosDemo } from "@/lib/mock/admin"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { TablaDemo, type FilaDemo } from "./tabla-demo"
import { filasProductos, filasStock, filasMovimientos } from "./filas-demo"
import { EncabezadoAdmin, AvisoDemo, PanelAdmin, EtiquetaEstado } from "./piezas-admin"

const definiciones = {
  productos: { titulo: "Productos", descripcion: "Listado de accesorios y su visibilidad pública. Solo muestra visual.", columnas: ["Producto", "Categoría", "Precio mock", "Visibilidad"], filas: filasProductos },
  stock: { titulo: "Stock", descripcion: "Existencias y mínimos opcionales de una muestra estática.", columnas: ["Producto", "Stock mock", "Mínimo mock", "Estado mock"], filas: filasStock },
  proveedores: { titulo: "Proveedores", descripcion: "Referencias ficticias para explorar la composición del listado.", columnas: ["Referencia", "Proveedor", "Nota de muestra"], filas: proveedoresDemo.map(p => ({ id: p.id, buscar: `${p.id} ${p.nombre} ${p.nota}`, celdas: [p.id, <span key="nombre" className="font-medium">{p.nombre}</span>, p.nota], detalle: [{ nombre: "Referencia", valor: p.id }, { nombre: "Nombre de muestra", valor: p.nombre }, { nombre: "Nota", valor: p.nota }] })) as FilaDemo[] },
  compras: { titulo: "Compras", descripcion: "Historial mock de octubre. No registra compras ni modifica stock.", columnas: ["Referencia", "Fecha", "Detalle", "Importe", "Estado"], filas: filasMovimientos(comprasDemo) },
  ventas: { titulo: "Ventas", descripcion: "Historial mock de octubre, con ejemplos vigentes y anulados.", columnas: ["Referencia", "Fecha", "Detalle", "Importe", "Estado"], filas: filasMovimientos(ventasDemo) },
  egresos: { titulo: "Egresos", descripcion: "Egresos manuales mock de octubre. Las compras no se duplican aquí.", columnas: ["Referencia", "Fecha", "Detalle", "Importe", "Estado"], filas: filasMovimientos(egresosDemo) },
}

export function VistaModulo({ modulo }: { modulo: keyof typeof definiciones }) {
  const vista = definiciones[modulo]
  return <><EncabezadoAdmin titulo={vista.titulo} descripcion={vista.descripcion} /><AvisoDemo />{modulo === "stock" && <p className="text-xs leading-relaxed text-muted-foreground">Los estados están predefinidos para esta muestra; no implementan el criterio pendiente de stock bajo. Los productos sin mínimo no forman parte de esa consulta.</p>}<TablaDemo key={modulo} titulo={`${vista.titulo} de muestra`} descripcion="Campos y composición de prototipo; requieren validación con la SRS." columnas={vista.columnas} filas={vista.filas} /></>
}

export function ConfiguracionDemo() {
  return <><EncabezadoAdmin titulo="Configuración" descripcion="Un espacio reservado para las decisiones que tome el equipo." /><AvisoDemo /><PanelAdmin className="flex min-h-[420px] items-center justify-center"><Empty><EmptyHeader><EmptyMedia variant="icon"><Settings /></EmptyMedia><EtiquetaEstado>Pendiente</EtiquetaEstado><EmptyTitle>Prototipo pendiente de definición</EmptyTitle><EmptyDescription>No hay configuraciones validadas para mostrar. No se incorporaron campos, preferencias ni perfiles adicionales.</EmptyDescription></EmptyHeader></Empty></PanelAdmin></>
}
