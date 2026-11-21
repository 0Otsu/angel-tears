import { DIAS_SEMANA, type ConfiguracionNegocio, type DiaAtencion, type FranjaAtencion, type HorariosAtencion } from "@/lib/modulos/configuracion/contrato"

export const NOMBRES_DIAS: Record<DiaAtencion, string> = {
  lunes: "Lunes", martes: "Martes", miercoles: "Miércoles", jueves: "Jueves",
  viernes: "Viernes", sabado: "Sábado", domingo: "Domingo",
}

type GrupoHorario = { dias: DiaAtencion[]; franjas: FranjaAtencion[] }

function agruparHorarios(horarios: HorariosAtencion): GrupoHorario[] {
  const grupos = new Map<string, GrupoHorario>()
  for (const dia of DIAS_SEMANA) {
    const franjas = horarios[dia]
    const clave = franjas.map(({ apertura, cierre }) => `${apertura}-${cierre}`).join(",")
    const grupo = grupos.get(clave)
    if (grupo) grupo.dias.push(dia)
    else grupos.set(clave, { dias: [dia], franjas })
  }
  return [...grupos.values()]
}

export function describirDias(dias: DiaAtencion[]): string {
  const rangos: DiaAtencion[][] = []
  for (const dia of dias) {
    const previo = rangos.at(-1)
    const ultimo = previo?.at(-1)
    if (previo && ultimo && DIAS_SEMANA.indexOf(dia) === DIAS_SEMANA.indexOf(ultimo) + 1) previo.push(dia)
    else rangos.push([dia])
  }
  return rangos.map(([inicio, ...resto]) => {
    const fin = resto.at(-1)
    return fin ? `${NOMBRES_DIAS[inicio]} a ${NOMBRES_DIAS[fin].toLowerCase()}` : NOMBRES_DIAS[inicio]
  }).join(", ")
}

export function describirFranjas(franjas: FranjaAtencion[]): string {
  return franjas.length ? franjas.map(({ apertura, cierre }) =>
    apertura && cierre ? `${apertura} a ${cierre}` : "Horario incompleto",
  ).join(" · ") : "Cerrado"
}

export function proyectarNegocioPublico(datos: ConfiguracionNegocio) {
  return {
    direccion: datos.direccion,
    referencia: datos.referencia,
    localidad: datos.localidad,
    provincia: datos.provincia,
    ciudad: `${datos.localidad}, ${datos.provincia}`,
    gruposHorarios: agruparHorarios(datos.horarios),
    comoLlegar: datos.comoLlegar,
    telefonoWhatsApp: `+${datos.telefonoWhatsApp}`,
    whatsapp: `https://wa.me/${datos.telefonoWhatsApp}`,
    usuarioInstagram: `@${datos.usuarioInstagram}`,
    instagram: `https://www.instagram.com/${datos.usuarioInstagram}/`,
  }
}

export type NegocioPublico = ReturnType<typeof proyectarNegocioPublico>
