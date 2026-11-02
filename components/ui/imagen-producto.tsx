"use client"
import { useState, type ComponentProps } from "react"
import Image from "next/image"
import { deliveryCloudinary, urlCloudinaryVersionada, urlImagenSegura } from "@/lib/imagen-delivery"

// Cloudinary directo con srcset; referencias HTTPS historicas no se envian al proxy Next.
export function ImagenProducto({ src, alt, className, ...props }: Omit<ComponentProps<typeof Image>, "src" | "loader" | "unoptimized" | "onError"> & { src: string }) {
  const [fallida, marcar] = useState<string | null>(null)
  if (!urlImagenSegura(src) || fallida === src) return <span role={alt ? "img" : undefined} aria-label={alt ? `${alt}. Imagen no disponible` : undefined} aria-hidden={!alt || undefined} className={`${props.fill ? "absolute inset-0" : ""} ${className ?? ""} flex items-center justify-center bg-card p-3 text-center text-xs text-muted-foreground`}>Imagen no disponible</span>
  const cloudinary = urlCloudinaryVersionada(src) !== null
  return <Image {...props} src={src} alt={alt} className={className} loader={cloudinary ? deliveryCloudinary : undefined} unoptimized={!cloudinary} onError={() => marcar(src)} />
}
