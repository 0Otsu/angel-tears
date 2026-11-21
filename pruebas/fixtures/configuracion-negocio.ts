import type { ConfiguracionNegocio } from "@/lib/modulos/configuracion/contrato"

export const configuracionPrueba: ConfiguracionNegocio = {
  direccion: "Calle de prueba 123",
  localidad: "Localidad de prueba",
  provincia: "Entre Ríos",
  referencia: "Local 2",
  horarios: {
    lunes: [{ apertura: "09:30", cierre: "12:15" }, { apertura: "16:00", cierre: "20:00" }],
    martes: [],
    miercoles: [],
    jueves: [],
    viernes: [],
    sabado: [{ apertura: "09:30", cierre: "12:15" }, { apertura: "16:00", cierre: "20:00" }],
    domingo: [],
  },
  comoLlegar: "https://www.google.com/maps/search/?api=1&query=local",
  telefonoWhatsApp: "5491100000000",
  usuarioInstagram: "accesorios.prueba",
}
