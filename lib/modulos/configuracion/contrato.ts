export const DIAS_SEMANA = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"] as const
export type DiaAtencion = typeof DIAS_SEMANA[number]

export type ConfiguracionNegocio = {
  direccion: string
  localidad: string
  provincia: string
  referencia: string
  diasAtencion: DiaAtencion[]
  apertura: string
  cierre: string
  comoLlegar: string
  telefonoWhatsApp: string
  usuarioInstagram: string
}

export type ResultadoConfiguracion =
  | { estado: "ok"; configuracion: ConfiguracionNegocio }
  | { estado: "datos_invalidos"; errores: Partial<Record<keyof ConfiguracionNegocio, string[]>> }
  | { estado: "sesion_requerida" | "error_tecnico" }
