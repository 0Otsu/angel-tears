// Lista fija aprobada (decisiones C4 y actualizacion 8). Los codigos son estables;
// no provienen de los fixtures visuales ni habilitan un CRUD de categorias.
export const CODIGOS_CATEGORIA = [
  "collares",
  "pulseras",
  "anillos",
  "aros-piercings",
  "tobilleras",
  "llaveros",
  "flores-eternas",
] as const

export type CodigoCategoria = (typeof CODIGOS_CATEGORIA)[number]

export const CATEGORIAS_INICIALES: readonly { codigo: CodigoCategoria; nombre: string }[] = [
  { codigo: "collares", nombre: "Collares" },
  { codigo: "pulseras", nombre: "Pulseras" },
  { codigo: "anillos", nombre: "Anillos" },
  { codigo: "aros-piercings", nombre: "Aros / Piercings" },
  { codigo: "tobilleras", nombre: "Tobilleras" },
  { codigo: "llaveros", nombre: "Llaveros" },
  { codigo: "flores-eternas", nombre: "Flores eternas" },
]
