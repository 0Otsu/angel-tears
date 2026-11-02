import type { CodigoCategoria } from "@/lib/modulos/productos/categorias"

/** Proyeccion publica allowlist: sin saldo exacto, minimo, version o identificadores del proveedor. */
export type ProductoPublico = {
  id: string
  slug: string
  nombre: string
  precio: string
  moneda: "ARS"
  categoriaCodigo: CodigoCategoria
  categoriaNombre: string
  descripcion: string | null
  material: string | null
  medida: string | null
  color: string | null
  cuidados: string | null
  disponible: boolean
  destacado: boolean
  galeria?: { url: string; ancho: number; alto: number; alt: string }[]
  imagen: { url: string; ancho: number; alto: number; alt: string } | null
}
