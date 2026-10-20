// Contrato publico del modulo autenticacion (blueprint, seccion 6): `exigirAdministradora`.
// Es la unica forma en que los demas modulos conocen la identidad de la Administradora.
// Modulo puro: no importa Next, Better Auth ni la base de datos, para que Productos,
// Inventario y Compras lo usen y lo prueben con un verificador falso sin esperar a Auth.

/** Identidad minima de la Administradora. Nunca incluye hash, token, sesion ni otros datos. */
export type IdentidadAdministradora = {
  readonly id: string
  readonly nombre: string
  readonly email: string
}

export const CODIGO_SESION_REQUERIDA = "SESION_REQUERIDA" as const

/**
 * No hay una sesion de administradora valida. Cubre ausencia, vencimiento y revocacion sin
 * distinguirlos: quien llama no debe poder usar la diferencia para sondear sesiones. El mensaje
 * es fijo y no contiene datos de la solicitud.
 */
export class ErrorSesionRequerida extends Error {
  readonly codigo = CODIGO_SESION_REQUERIDA

  constructor() {
    super("Se requiere una sesion de administradora valida.")
    this.name = "ErrorSesionRequerida"
  }
}

export function esErrorSesionRequerida(error: unknown): error is ErrorSesionRequerida {
  return error instanceof ErrorSesionRequerida
}

/**
 * Resuelve la identidad a partir de los encabezados de la solicitud (la cookie de sesion),
 * o devuelve `null` si no hay una sesion valida. Si falla por un problema tecnico (por ejemplo,
 * base de datos caida) debe lanzar: el error se propaga y nunca se concede acceso.
 */
export type VerificadorSesion = (encabezados: Headers) => Promise<IdentidadAdministradora | null>

/**
 * Exige una Administradora autenticada o lanza `ErrorSesionRequerida`.
 *
 * Debe llamarse en el servidor, junto a cada lectura privada y en cada Server Action o Route
 * Handler que modifique datos, antes de cualquier efecto: la interfaz, un layout o un proxy
 * no sustituyen esta comprobacion.
 */
export type ExigirAdministradora = (encabezados: Headers) => Promise<IdentidadAdministradora>

export function crearExigirAdministradora(verificar: VerificadorSesion): ExigirAdministradora {
  return async (encabezados) => {
    const identidad = await verificar(encabezados)
    if (!identidad || !identidad.id) {
      throw new ErrorSesionRequerida()
    }
    // Se copian solo los campos del contrato: aunque el verificador devuelva mas datos
    // (hash, token, sesion), nunca llegan a quien llama.
    return { id: identidad.id, nombre: identidad.nombre, email: identidad.email }
  }
}
