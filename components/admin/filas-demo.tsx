import Image from "next/image"
import { productosDemo, importeDemo, type MovimientoDemo } from "@/lib/mock/admin"
import { EtiquetaEstado } from "./piezas-admin"
import type { FilaDemo } from "./tabla-demo"

function ProductoEnFila({ producto }: { producto: typeof productosDemo[number] }) {
  return <div className="flex items-center gap-3"><Image src={producto.imagen} width={40} height={40} alt="" className="size-10 rounded-lg object-cover" /><span><span className="block text-xs font-medium">{producto.nombre}</span><span className="mt-1 block text-[10px] text-muted-foreground">{producto.id}</span></span></div>
}

export const filasProductos: FilaDemo[] = productosDemo.map(p => ({
  id: p.id,
  buscar: `${p.nombre} ${p.categoria} ${p.id}`,
  estado: p.publicado ? "Publicado" : "Oculto",
  celdas: [<ProductoEnFila key="producto" producto={p} />, p.categoria, <span key="importe" className="tabular-nums">{importeDemo(p.precio)}</span>, <EtiquetaEstado key="estado" tono={p.publicado ? "oliva" : "neutro"}>{p.publicado ? "Publicado" : "Oculto"}</EtiquetaEstado>],
  detalle: [{ nombre: "Producto", valor: p.nombre }, { nombre: "Categoría", valor: p.categoria }, { nombre: "Precio de muestra", valor: importeDemo(p.precio) }, { nombre: "Visibilidad", valor: p.publicado ? "Publicado" : "Oculto" }],
}))

export const filasStock: FilaDemo[] = productosDemo.map(p => ({
  id: p.id,
  buscar: `${p.nombre} ${p.id}`,
  estado: p.estadoStock,
  celdas: [<ProductoEnFila key="producto" producto={p} />, <span key="stock" className="font-medium tabular-nums">{p.stock}</span>, p.minimo ?? "Sin mínimo", <EtiquetaEstado key="estado" tono={p.estadoStock === "Disponible" ? "oliva" : ["Stock bajo", "Sin stock"].includes(p.estadoStock) ? "alerta" : "neutro"}>{p.estadoStock}</EtiquetaEstado>],
  detalle: [{ nombre: "Producto", valor: p.nombre }, { nombre: "Stock mock", valor: String(p.stock) }, { nombre: "Mínimo mock", valor: p.minimo === null ? "Sin mínimo" : String(p.minimo) }, { nombre: "Estado de muestra", valor: p.estadoStock }],
}))

export function filasMovimientos(datos: MovimientoDemo[]): FilaDemo[] {
  return datos.map(m => ({ id: m.id, buscar: `${m.id} ${m.detalle} ${m.fecha}`, estado: m.estado,
    celdas: [<span key="id" className="font-medium">{m.id}</span>, <span key="fecha" className="text-muted-foreground">{m.fecha}</span>, m.detalle, <span key="importe" className="font-medium tabular-nums">{importeDemo(m.importe)}</span>, <EtiquetaEstado key="estado" tono={m.estado === "Vigente" ? "oliva" : "neutro"}>{m.estado}</EtiquetaEstado>],
    detalle: [{ nombre: "Referencia", valor: m.id }, { nombre: "Fecha mock", valor: m.fecha }, { nombre: "Descripción de muestra", valor: m.detalle }, { nombre: "Importe", valor: importeDemo(m.importe) }, { nombre: "Estado mock", valor: m.estado }],
  }))
}
