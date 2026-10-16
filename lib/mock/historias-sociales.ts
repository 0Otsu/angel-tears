export type SocialItem = {
  type: "image" | "video"
  src: string
  alt: string
}

// Historias reales aportadas por el usuario. Sin atribuciones ni métricas añadidas.
export const historiasSociales: SocialItem[] = [
  {
    type: "image",
    src: "/images/historias/accesorios-compartidos.jpg",
    alt: "Pulseras, cadenas y dijes sobre tarjetas de Angel Tears, compartidos en una historia.",
  },
  {
    type: "image",
    src: "/images/historias/anillos-y-pulsera.jpg",
    alt: "Una mano con anillos de flores y una pulsera con cuentas y dijes, al aire libre.",
  },
  {
    type: "image",
    src: "/images/historias/pedido-y-packaging.jpg",
    alt: "Accesorios en sus envoltorios de Angel Tears junto a una tarjeta de agradecimiento.",
  },
]
