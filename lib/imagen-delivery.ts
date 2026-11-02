// Delivery solamente: nunca modifica la referencia persistida ni permite fetch/upload remoto.
const anchos = [64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1600, 1920] as const
export function urlCloudinaryVersionada(src: string): URL | null {
  try {
    const u = new URL(src)
    if (u.protocol !== "https:" || u.hostname !== "res.cloudinary.com" || u.port || u.username || u.password || u.search || u.hash) return null
    if (!/^\/[a-zA-Z0-9_-]+\/image\/upload\/v[1-9]\d*\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp)$/.test(u.pathname)) return null
    return u
  } catch { return null }
}
export function urlImagenSegura(src: string): boolean {
  try {
    const u = new URL(src)
    return u.protocol === "https:" && !u.port && !u.username && !u.password
      && (u.hostname !== "res.cloudinary.com" || urlCloudinaryVersionada(src) !== null)
  } catch { return false }
}
export function deliveryCloudinary({ src, width }: { src: string; width: number }): string {
  const u = urlCloudinaryVersionada(src)
  if (!u || !Number.isFinite(width) || width <= 0) throw new Error("Referencia de imagen no válida")
  const ancho = anchos.find(n => n >= width) ?? anchos[anchos.length - 1]
  u.pathname = u.pathname.replace("/image/upload/", `/image/upload/c_limit,w_${ancho}/q_auto/f_auto/`)
  return u.href
}
