import { productosPublicosDemo } from "./productos"

// Datos ficticios del prototipo. No representan registros, consultas ni reglas de negocio reales.
export type PeriodoDemo = "octubre" | "septiembre"
export const periodosDemo = {
  octubre: { nombre: "Octubre 2026", rango: "01–31 oct · período de muestra", series: [
    { semana: "01–07", ventas: 56000, compras: 31000, egresos: 8000 },
    { semana: "08–14", ventas: 72000, compras: 45000, egresos: 12000 },
    { semana: "15–21", ventas: 68000, compras: 36000, egresos: 9000 },
    { semana: "22–31", ventas: 90000, compras: 30000, egresos: 9000 },
  ] },
  septiembre: { nombre: "Septiembre 2026", rango: "01–30 sep · período de muestra", series: [
    { semana: "01–07", ventas: 48000, compras: 27000, egresos: 7000 },
    { semana: "08–14", ventas: 62000, compras: 35000, egresos: 10000 },
    { semana: "15–21", ventas: 57000, compras: 34000, egresos: 9000 },
    { semana: "22–30", ventas: 65000, compras: 30000, egresos: 9000 },
  ] },
}

const inventarioDemo = [
  {
    "id": "P-001",
    "slug": "collar-aura",
    "stock": 18,
    "minimo": 5,
    "estadoStock": "Disponible",
    "publicado": true
  },
  {
    "id": "P-002",
    "slug": "pulsera-olivia",
    "stock": 4,
    "minimo": 6,
    "estadoStock": "Stock bajo",
    "publicado": true
  },
  {
    "id": "P-003",
    "slug": "anillo-celeste",
    "stock": 0,
    "minimo": 3,
    "estadoStock": "Sin stock",
    "publicado": true
  },
  {
    "id": "P-004",
    "slug": "aros-luna",
    "stock": 7,
    "minimo": null,
    "estadoStock": "Sin mínimo",
    "publicado": false
  },
  {
    "id": "P-005",
    "slug": "tobillera-serena",
    "stock": 9,
    "minimo": 2,
    "estadoStock": "Disponible",
    "publicado": false
  },
  {
    "id": "P-006",
    "slug": "llavero-corazon",
    "stock": 2,
    "minimo": 4,
    "estadoStock": "Stock bajo",
    "publicado": true
  }
]

export const productosDemo = inventarioDemo.map(({ slug, ...inventario }) => {
  const producto = productosPublicosDemo.find(producto => producto.id === slug)!
  return { ...inventario, nombre: producto.name, categoria: producto.category, precio: producto.price, imagen: producto.image }
})

// Estados de stock predefinidos para dibujar la UI; no deciden el umbral pendiente (< o <=).
export const stockBajoDemo = productosDemo.filter(p => ["Stock bajo", "Sin stock"].includes(p.estadoStock))
export const proveedoresDemo = [
  { id: "PR-001", nombre: "Proveedor de accesorios A", nota: "Referencia ficticia · bijouterie" },
  { id: "PR-002", nombre: "Proveedor de accesorios B", nota: "Referencia ficticia · complementos" },
  { id: "PR-003", nombre: "Proveedor de accesorios C", nota: "Referencia ficticia · regalos" },
]

export type MovimientoDemo = { id: string; fecha: string; detalle: string; importe: number; estado: "Vigente" | "Anulada" | "Anulado" }
export const ventasDemo: MovimientoDemo[] = [
  { id: "V-104", fecha: "26/10/2026", detalle: "Consumidor Final · accesorios", importe: 90000, estado: "Vigente" },
  { id: "V-103", fecha: "19/10/2026", detalle: "Consumidor Final · accesorios", importe: 68000, estado: "Vigente" },
  { id: "V-102", fecha: "12/10/2026", detalle: "Consumidor Final · accesorios", importe: 72000, estado: "Vigente" },
  { id: "V-101", fecha: "05/10/2026", detalle: "Consumidor Final · accesorios", importe: 56000, estado: "Vigente" },
  { id: "V-100", fecha: "02/10/2026", detalle: "Venta de muestra anulada", importe: 12000, estado: "Anulada" },
]
export const comprasDemo: MovimientoDemo[] = [
  { id: "C-044", fecha: "25/10/2026", detalle: "Proveedor A · accesorios", importe: 30000, estado: "Vigente" },
  { id: "C-043", fecha: "18/10/2026", detalle: "Proveedor B · accesorios", importe: 36000, estado: "Vigente" },
  { id: "C-042", fecha: "11/10/2026", detalle: "Proveedor A · accesorios", importe: 45000, estado: "Vigente" },
  { id: "C-041", fecha: "04/10/2026", detalle: "Proveedor C · accesorios", importe: 31000, estado: "Vigente" },
]
export const egresosDemo: MovimientoDemo[] = [
  { id: "E-024", fecha: "27/10/2026", detalle: "Egreso manual de muestra D", importe: 9000, estado: "Vigente" },
  { id: "E-023", fecha: "20/10/2026", detalle: "Egreso manual de muestra C", importe: 9000, estado: "Vigente" },
  { id: "E-022", fecha: "13/10/2026", detalle: "Egreso manual de muestra B", importe: 12000, estado: "Vigente" },
  { id: "E-021", fecha: "06/10/2026", detalle: "Egreso manual de muestra A", importe: 8000, estado: "Vigente" },
  { id: "E-020", fecha: "01/10/2026", detalle: "Egreso de muestra anulado", importe: 5000, estado: "Anulado" },
]

// Formato visual del mock; no fija moneda ni redondeo para el producto definitivo.
export const importeDemo = (valor: number) => `$ ${valor.toLocaleString("es-AR")}`

// Candidato visual: no es una métrica de negocio.
export const segmentosDemo = [
    { nombre: "Muestra A", valor: 40, color: "var(--primary)" },
    { nombre: "Muestra B", valor: 35, color: "var(--accent)" },
    { nombre: "Muestra C", valor: 25, color: "var(--secondary)" },
  ]
