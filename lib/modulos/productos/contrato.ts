import type { CodigoCategoria } from "@/lib/modulos/productos/categorias"

/** Referencia interna compartida: no contiene saldo, minimo, costos ni datos de Auth. */
export type ProductoInterno = {
  readonly id: string
  readonly nombre: string
  readonly slug: string
  readonly categoriaCodigo: CodigoCategoria
  readonly categoriaNombre: string
  /** Decimal exacto de dos posiciones, nunca number ni bigint serializado. */
  readonly precio: string
  readonly moneda: "ARS"
  readonly publicado: boolean
  readonly imagenValida: boolean
}

/**
 * Lectura privada batched para Compras/Inventario/Ventas. Incluye productos ocultos;
 * los IDs inexistentes se omiten. No filtra por stock ni decide disponibilidad publica.
 * Verifica Auth antes de consultar, incluso para una lista vacia.
 */
export type ConsultarProductosInternos = (
  encabezados: Headers,
  productoIds: readonly string[],
) => Promise<readonly ProductoInterno[]>
