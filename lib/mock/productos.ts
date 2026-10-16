// Fixtures visuales: no son catálogo, disponibilidad ni precios comerciales reales.
export const productosPublicosDemo = [
  {
    "id": "collar-aura",
    "name": "Collar Aura",
    "category": "Collares",
    "price": 28500,
    "image": "/images/products/angel-tears-gold-jewelry.png",
    "tagline": "Un detalle sutil para todos los días.",
    "description": "Un detalle para vos o para regalar. Consultanos por esta pieza y sus características.",
    "details": "Materiales y medidas por confirmar. Consultanos las características de esta pieza en Instagram."
  },
  {
    "id": "pulsera-olivia",
    "name": "Pulsera Olivia",
    "category": "Pulseras",
    "price": 19800,
    "image": "/images/products/angel-tears-charms.png",
    "tagline": "Un gesto pequeño que dice mucho.",
    "description": "Un accesorio para acompañar tu estilo o elegir como regalo. Consultanos por esta pieza.",
    "details": "Materiales y medidas por confirmar. Consultanos las características de esta pieza en Instagram."
  },
  {
    "id": "anillo-celeste",
    "name": "Anillo Celeste",
    "category": "Anillos",
    "price": 16400,
    "image": "/images/products/angel-tears-rings.png",
    "tagline": "La pieza justa para cerrar tu look.",
    "description": "Un detalle para completar tu look. Consultanos por esta pieza antes de elegirla.",
    "details": "Materiales y medidas por confirmar. Consultanos las características de esta pieza en Instagram."
  },
  {
    "id": "aros-luna",
    "name": "Aros Luna",
    "category": "Aros",
    "price": 14200,
    "image": "/images/products/angel-tears-rings.png",
    "tagline": "Luz suave para acompañarte.",
    "description": "Un accesorio para vos o para regalar. Consultanos por esta pieza y su disponibilidad.",
    "details": "Materiales y medidas por confirmar. Consultanos las características de esta pieza en Instagram."
  },
  {
    "id": "tobillera-serena",
    "name": "Tobillera Serena",
    "category": "Tobilleras",
    "price": 17600,
    "image": "/images/products/angel-tears-gold-jewelry.png",
    "tagline": "Un detalle para vos o para regalar.",
    "description": "Un detalle para vos o para regalar. Consultanos por esta pieza y sus características.",
    "details": "Materiales y medidas por confirmar. Consultanos las características de esta pieza en Instagram."
  },
  {
    "id": "llavero-corazon",
    "name": "Llavero Corazón",
    "category": "Llaveros",
    "price": 8900,
    "image": "/images/products/angel-tears-charms.png",
    "tagline": "Un detalle para vos o para regalar.",
    "description": "Un detalle para vos o para regalar. Consultanos por esta pieza y sus características.",
    "details": "Materiales y medidas por confirmar. Consultanos las características de esta pieza en Instagram."
  },
  {
    "id": "flor-eternidad",
    "name": "Flor Eternidad",
    "category": "Flores eternas",
    "price": 32000,
    "image": "/images/products/angel-tears-charms.png",
    "tagline": "Un detalle para vos o para regalar.",
    "description": "Un detalle para vos o para regalar. Consultanos por esta pieza y sus características.",
    "details": "Materiales y medidas por confirmar. Consultanos las características de esta pieza en Instagram."
  }
]

export type ProductoMock = (typeof productosPublicosDemo)[number]
export const categoriasPublicas = ["Todos","Collares","Pulseras","Anillos","Aros","Tobilleras","Llaveros","Flores eternas"]
export const formatearPrecioDemo = (precio: number) => `$${precio.toLocaleString("es-AR")}`
export const buscarProductoDemo = (slug: string) => productosPublicosDemo.find(producto => producto.id === slug)
