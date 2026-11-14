import { createHash } from "node:crypto"
import { centavosADecimal, decimalACentavos } from "../../lib/modulos/compras/dinero"
import type { CodigoCategoria } from "../../lib/modulos/productos/categorias"

export const CORTE_DEMO = "2026-11-14"
export function idDemo(clave: string): string {
  const bytes = createHash("sha256").update(`angel-tears-demo:20261118:v1:${clave}`).digest().subarray(0, 16)
  bytes[6] = (bytes[6] & 15) | 64
  bytes[8] = (bytes[8] & 63) | 128
  const h = bytes.toString("hex")
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

const catalogo: [string, CodigoCategoria, number, string][] = [
  ["Collar Luna de acero", "collares", 9500, "Acero inoxidable"],
  ["Collar Sol dorado", "collares", 12000, "Acero con baño dorado"],
  ["Collar Estrella con dije", "collares", 8500, "Acero inoxidable"],
  ["Collar Perlas del río", "collares", 16000, "Perlas de vidrio"],
  ["Pulsera Trébol", "pulseras", 6500, "Acero inoxidable"],
  ["Pulsera Corazón", "pulseras", 7500, "Acero con baño dorado"],
  ["Pulsera Cristal", "pulseras", 8000, "Cristal y acero"],
  ["Pulsera Cadenita", "pulseras", 5500, "Acero inoxidable"],
  ["Anillo Ondas", "anillos", 4500, "Acero inoxidable"],
  ["Anillo Mariposa", "anillos", 5500, "Acero con baño dorado"],
  ["Anillo Espiral", "anillos", 6500, "Acero inoxidable"],
  ["Anillo Flor", "anillos", 7500, "Acero inoxidable"],
  ["Aros Argollas pequeñas", "aros-piercings", 5000, "Acero inoxidable"],
  ["Aros Gotas", "aros-piercings", 8500, "Acero con baño dorado"],
  ["Aros Estrella", "aros-piercings", 7000, "Acero inoxidable"],
  ["Aros Perla", "aros-piercings", 11000, "Perlas de vidrio y acero"],
  ["Tobillera Delfín", "tobilleras", 5500, "Acero inoxidable"],
  ["Tobillera Caracol", "tobilleras", 6500, "Acero con baño dorado"],
  ["Llavero Mariposa", "llaveros", 3500, "Metal y acrílico"],
  ["Llavero Corazón", "llaveros", 4500, "Metal y resina"],
  ["Ramo de tres flores eternas", "flores-eternas", 18000, "Cinta de raso y papel"],
  ["Ramo de seis flores eternas", "flores-eternas", 28000, "Cinta de raso y papel"],
  ["Flor eterna individual", "flores-eternas", 7000, "Cinta de raso"],
  ["Tobillera Estrella", "tobilleras", 7500, "Acero inoxidable"],
  ["Collar Aurora", "collares", 12500, "Acero inoxidable"],
]

export const PRODUCTOS_DEMO = catalogo.map(([nombre, categoriaCodigo, pesos, material], i) => ({
  id: idDemo(`producto:${i}`), nombre, categoriaCodigo, precio: `${pesos}.00`, material,
  descripcion: `${nombre}. Un accesorio para regalar o acompañarte todos los días.`,
  cuidados: "Evitar perfumes y productos de limpieza. Guardar en un lugar seco.",
  publicar: i < 20 || i === 22 || i === 23 || i === 24,
  destacado: [0, 4, 13, 20].includes(i),
  inicial: i === 24 ? 5 : i === 22 ? 2 : 0,
}))
export const PRODUCTO_EXPOSICION = PRODUCTOS_DEMO[24]
export const PROVEEDORES_DEMO = ["Luna Accesorios", "Río Bijou", "Destellos Mayorista", "Jardín de Cintas"].map((nombre, i) => ({
  id: idDemo(`proveedor:${i}`), nombre, nota: "Proveedor ficticio del entorno de demostración.",
}))

export type VentaPlan = { clave: string; fecha: string; anulada: boolean; lineas: { productoId: string; cantidad: number }[] }
export type CompraPlan = { clave: string; fecha: string; anulada: boolean; proveedorId: string; lineas: { productoId: string; cantidad: number; costoUnitario: string }[] }
export type GastoPlan = { clave: string; fecha: string; anulado: boolean; concepto: string; importe: string }

function repartir(total: bigint, cantidad: number, paso = BigInt(1)): bigint[] {
  const pesos = Array.from({ length: cantidad }, (_, i) => BigInt(80 + (i * 17) % 41))
  const suma = pesos.reduce((a, b) => a + b, BigInt(0))
  const valores = pesos.map(p => total * p / suma / paso * paso)
  valores[valores.length - 1] += total - valores.reduce((a, b) => a + b, BigInt(0))
  return valores
}

/** Compone tickets de varias unidades con precios del catalogo; nunca inserta totales. */
function lineasVenta(importe: bigint, inicio: number): VentaPlan["lineas"] {
  const opciones = Array.from({ length: 22 }, (_, j) => (inicio + j) % 22)
  const unidades = Number(importe / BigInt(50000))
  const pasos = Array<number>(unidades + 1).fill(-1)
  pasos[0] = 0
  const primero = opciones.find(i => Number(decimalACentavos(PRODUCTOS_DEMO[i].precio)! / BigInt(50000)) <= unidades - 14)!
  const primeraCantidad = Number(decimalACentavos(PRODUCTOS_DEMO[primero].precio)! / BigInt(50000))
  const resto = unidades - primeraCantidad
  for (let n = 1; n <= resto; n++) {
    const i = opciones.find(i => {
      const costo = Number(decimalACentavos(PRODUCTOS_DEMO[i].precio)! / BigInt(50000))
      return n >= costo && pasos[n - costo] !== -1
    })
    if (i !== undefined) pasos[n] = i + 1
  }
  if (pasos[resto] === -1) throw new Error("Ticket de demo no representable con el catalogo.")
  const cantidades = new Map<number, number>([[primero, 1]])
  for (let n = resto; n > 0;) {
    const i = pasos[n] - 1
    cantidades.set(i, (cantidades.get(i) ?? 0) + 1)
    n -= Number(decimalACentavos(PRODUCTOS_DEMO[i].precio)! / BigInt(50000))
  }
  return [...cantidades].map(([i, cantidad]) => ({ productoId: PRODUCTOS_DEMO[i].id, cantidad }))
}

export function crearPlanDemo() {
  const ventas: VentaPlan[] = [], compras: CompraPlan[] = [], gastos: GastoPlan[] = []
  const objetivos = [
    [7, 1450000, 650000, 140000], [8, 1620000, 720000, 160000],
    [9, 1850000, 810000, 170000], [10, 2020000, 900000, 190000], [11, 960000, 430000, 85000],
  ]
  const conceptos = ["Cintas e insumos para flores eternas", "Envoltorios y bolsas de regalo", "Transporte y traslados", "Servicios y materiales de trabajo", "Traslado registrado por duplicado"]
  for (const [mes, objetivoVentas, objetivoCompras, objetivoGastos] of objetivos) {
    const prefijo = `2026-${String(mes).padStart(2, "0")}`, ultimo = mes === 11 ? 14 : new Date(Date.UTC(2026, mes, 0)).getUTCDate()
    const fecha = (dia: number) => `${prefijo}-${String(dia).padStart(2, "0")}`
    const tickets = repartir(BigInt(objetivoVentas) * BigInt(100), 38, BigInt(50000))
    const ventasMes = Array.from({ length: 40 }, (_, i): VentaPlan => ({
      clave: idDemo(`venta:${mes}:${i}`), fecha: fecha(7 + Math.floor(i * (ultimo - 6) / 40)),
      anulada: i >= 38, lineas: lineasVenta(i < 38 ? tickets[i] : BigInt(2000000), i + mes),
    }))
    ventas.push(...ventasMes)
    // Comprar todo lo que se vendera (incluidas las ventas luego anuladas) y un remanente inicial.
    const demanda = new Map<string, number>()
    for (const v of ventasMes) for (const l of v.lineas) demanda.set(l.productoId, (demanda.get(l.productoId) ?? 0) + l.cantidad)
    const entradas = PRODUCTOS_DEMO.slice(0, 22).map((p, i) => ({ productoId: p.id, cantidad: (demanda.get(p.id) ?? 0) + (mes === 7 ? 3 : 0), precio: decimalACentavos(p.precio)!, grupo: i % 4 })).filter(l => l.cantidad > 0)
    const valorMinorista = entradas.reduce((s, l) => s + l.precio * BigInt(l.cantidad), BigInt(0))
    const presupuesto = BigInt(objetivoCompras) * BigInt(100)
    const lineas = entradas.map(l => ({ ...l, costo: presupuesto * l.precio / valorMinorista }))
    let resto = presupuesto - lineas.reduce((s, l) => s + l.costo * BigInt(l.cantidad), BigInt(0))
    for (let grupo = 0; grupo < 4; grupo++) {
      const detalle: CompraPlan["lineas"] = []
      for (const l of lineas.filter(l => l.grupo === grupo)) {
        // Reparte los centavos residuales en una unidad, sin alterar cantidades ni totales a mano.
        if (resto > BigInt(0)) {
          detalle.push({ productoId: l.productoId, cantidad: 1, costoUnitario: centavosADecimal(l.costo + resto) })
          resto = BigInt(0)
          if (l.cantidad > 1) detalle.push({ productoId: l.productoId, cantidad: l.cantidad - 1, costoUnitario: centavosADecimal(l.costo) })
        } else detalle.push({ productoId: l.productoId, cantidad: l.cantidad, costoUnitario: centavosADecimal(l.costo) })
      }
      compras.push({ clave: idDemo(`compra:${mes}:${grupo}`), fecha: fecha([1, 2, 4, 6][grupo]), anulada: false, proveedorId: PROVEEDORES_DEMO[grupo].id, lineas: detalle })
    }
    compras.push({ clave: idDemo(`compra:${mes}:anulada`), fecha: fecha(3), anulada: true, proveedorId: PROVEEDORES_DEMO[0].id,
      lineas: [{ productoId: PRODUCTOS_DEMO[0].id, cantidad: 3, costoUnitario: "3500.00" }] })
    const importes = repartir(BigInt(objetivoGastos) * BigInt(100), 4, BigInt(100))
    for (let i = 0; i < 5; i++) gastos.push({ clave: idDemo(`gasto:${mes}:${i}`), fecha: fecha(Math.min(ultimo, [4, 10, 16, 23, 28][i])), anulado: i === 4,
      concepto: conceptos[i], importe: centavosADecimal(i === 4 ? BigInt(850000) : importes[i]) })
  }
  return { productos: PRODUCTOS_DEMO, proveedores: PROVEEDORES_DEMO, ventas, compras, gastos }
}

export function resumirPlan(plan = crearPlanDemo()) {
  const precios = new Map(plan.productos.map(p => [p.id, decimalACentavos(p.precio)!]))
  return ["07", "08", "09", "10", "11"].map(mes => {
    const prefijo = `2026-${mes}`
    const ventas = plan.ventas.filter(v => !v.anulada && v.fecha.startsWith(prefijo)).reduce((s, v) => s + v.lineas.reduce((t, l) => t + precios.get(l.productoId)! * BigInt(l.cantidad), BigInt(0)), BigInt(0))
    const compras = plan.compras.filter(c => !c.anulada && c.fecha.startsWith(prefijo)).reduce((s, c) => s + c.lineas.reduce((t, l) => t + decimalACentavos(l.costoUnitario)! * BigInt(l.cantidad), BigInt(0)), BigInt(0))
    const gastos = plan.gastos.filter(g => !g.anulado && g.fecha.startsWith(prefijo)).reduce((s, g) => s + decimalACentavos(g.importe)!, BigInt(0))
    return { mes: prefijo, ventas: centavosADecimal(ventas), compras: centavosADecimal(compras), gastos: centavosADecimal(gastos), resultado: centavosADecimal(ventas - compras - gastos) }
  })
}
