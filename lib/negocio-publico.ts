import type { ConfiguracionNegocio, DiaAtencion } from "@/lib/modulos/configuracion/contrato"

export const NOMBRES_DIAS: Record<DiaAtencion, string> = {
  lunes: "Lunes", martes: "Martes", miercoles: "Miércoles", jueves: "Jueves",
  viernes: "Viernes", sabado: "Sábado", domingo: "Domingo",
}

export function proyectarNegocioPublico(datos: ConfiguracionNegocio) {
  return {
    direccion: datos.direccion,
    referencia: datos.referencia,
    localidad: datos.localidad,
    provincia: datos.provincia,
    ciudad: `${datos.localidad}, ${datos.provincia}`,
    diasAtencion: datos.diasAtencion,
    apertura: datos.apertura,
    cierre: datos.cierre,
    comoLlegar: datos.comoLlegar,
    telefonoWhatsApp: `+${datos.telefonoWhatsApp}`,
    whatsapp: `https://wa.me/${datos.telefonoWhatsApp}`,
    usuarioInstagram: `@${datos.usuarioInstagram}`,
    instagram: `https://www.instagram.com/${datos.usuarioInstagram}/`,
  }
}

export type NegocioPublico = ReturnType<typeof proyectarNegocioPublico>
