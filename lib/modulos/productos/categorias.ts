// Categorías iniciales para bases nuevas y para el dataset de la demo.
export const CODIGOS_CATEGORIA = [
  "collares",
  "pulseras",
  "anillos",
  "aros-piercings",
  "tobilleras",
  "llaveros",
  "flores-eternas",
] as const

export type CodigoCategoria = string
export type CategoriaProducto = { codigo: CodigoCategoria; nombre: string }

export const CATEGORIAS_INICIALES: readonly CategoriaProducto[] = [
  { codigo: "collares", nombre: "Collares" },
  { codigo: "pulseras", nombre: "Pulseras" },
  { codigo: "anillos", nombre: "Anillos" },
  { codigo: "aros-piercings", nombre: "Aros / Piercings" },
  { codigo: "tobilleras", nombre: "Tobilleras" },
  { codigo: "llaveros", nombre: "Llaveros" },
  { codigo: "flores-eternas", nombre: "Flores eternas" },
]
