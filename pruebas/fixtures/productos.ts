import type { ProductoInterno } from "@/lib/modulos/productos/contrato"

// Solo pruebas de contratos. No seed comercial ni segundo modelo persistido.
export const ID_PRODUCTO_PRUEBA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
export const ID_OTRO_PRODUCTO_PRUEBA = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"

export const productoInternoPrueba: ProductoInterno = {
  id: ID_PRODUCTO_PRUEBA,
  nombre: "Collar de prueba",
  slug: "collar-de-prueba",
  categoriaCodigo: "collares",
  categoriaNombre: "Collares",
  precio: "90071992547409.93",
  moneda: "ARS",
  publicado: false,
  imagenValida: false,
}
