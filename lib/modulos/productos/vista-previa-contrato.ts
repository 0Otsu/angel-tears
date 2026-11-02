import type { ProductoPublico } from "@/lib/modulos/catalogo/contrato"

// Resultado exclusivo del admin. El DTO publico sigue sin version ni saldo exacto.
export type ResultadoVistaPrevia =
  | { estado: "ok"; producto: ProductoPublico; version: number }
  | { estado: "sesion_requerida" | "datos_invalidos" | "no_encontrado" | "conflicto_version" | "error_tecnico" }
