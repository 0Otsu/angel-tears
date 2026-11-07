// Tipos de la administracion de Proveedores (tareas 3.1, 3.2 y 3.3). Puros: los comparten el
// servidor y los componentes cliente. Las fechas viajan como texto ISO.

export type ProveedorAdministrativo = {
  id: string
  nombre: string
  telefono: string | null
  instagram: string | null
  nota: string | null
  activo: boolean
  version: number
  actualizadoEn: string
}

export type CampoProveedor = "nombre" | "telefono" | "instagram" | "nota"

export type ResultadoProveedorAdmin =
  | { estado: "ok"; proveedor: ProveedorAdministrativo }
  | { estado: "datos_invalidos"; errores: Partial<Record<CampoProveedor, string>> }
  | { estado: "no_encontrado" }
  /** Otra edicion se guardo antes: `proveedor` es la version vigente. */
  | { estado: "conflicto_version"; proveedor: ProveedorAdministrativo }
  | { estado: "sesion_requerida" }
  | { estado: "error_tecnico" }
