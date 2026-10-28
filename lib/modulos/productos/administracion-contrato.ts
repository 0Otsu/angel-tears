import type { DatosProducto } from "./validacion"
import type { CodigoCategoria } from "./categorias"

// Proyeccion propia del admin; no altera el DTO compartido ProductoInterno ni duplica stock.
export type ProductoAdministrativo = DatosProducto & {
  id: string
  slug: string
  categoriaNombre: string
  publicado: boolean
  destacado: boolean
  version: number
}

export type ConsultaAdministrativa = {
  productos: ProductoAdministrativo[]
  categorias: { codigo: CodigoCategoria; nombre: string }[]
}

export type ResultadoGuardarProducto =
  | { estado: "ok"; productoId: string }
  | { estado: "datos_invalidos"; errores: Record<string, string> }
  | { estado: "sesion_requerida" }
  | { estado: "no_encontrado" }
  | { estado: "conflicto_version" }
  | { estado: "error_tecnico" }

export type EstadoFormularioProducto = ResultadoGuardarProducto | { estado: "inicial" }
