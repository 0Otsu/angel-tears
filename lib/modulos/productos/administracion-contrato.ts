import type { DatosProducto } from "./validacion"
import type { CategoriaProducto } from "./categorias"

// Proyeccion propia del admin; no altera el DTO compartido ProductoInterno ni duplica stock.
export type ProductoAdministrativo = DatosProducto & {
  id: string
  slug: string
  categoriaNombre: string
  publicado: boolean
  destacado: boolean
  archivado: boolean
  version: number
  tieneImagen: boolean
  imagen: { urlSegura: string; ancho: number; alto: number; formato?: string } | null
}

export type ConsultaAdministrativa = {
  productos: ProductoAdministrativo[]
  categorias: CategoriaProducto[]
}

export type ResultadoGuardarProducto =
  | { estado: "ok"; productoId: string }
  | { estado: "datos_invalidos"; errores: Record<string, string> }
  | { estado: "sesion_requerida" }
  | { estado: "no_encontrado" }
  | { estado: "conflicto_version" }
  | { estado: "error_tecnico" }

export type EstadoFormularioProducto = ResultadoGuardarProducto | { estado: "inicial" }

export type ResultadoAltaCategoria =
  | { estado: "ok"; categoria: CategoriaProducto }
  | { estado: "nombre_invalido" | "duplicada" | "sesion_requerida" | "error_tecnico" }
