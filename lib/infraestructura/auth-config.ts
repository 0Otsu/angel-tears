import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import { crearEnviadorDesdeEntorno, type EnviarCorreo } from "./correo"
// Ruta relativa a proposito: la herramienta que genera el schema no resuelve el alias `@/`.
import * as esquemaAuth from "./esquemas/auth"
import { construirCorreoRecuperacion } from "../modulos/autenticacion/correo-recuperacion"

// Configuracion de Better Auth (ADR-004). Se arma en una funcion para poder usarla con la base
// de la aplicacion, con la de pruebas y con la herramienta que genera el schema. No importa
// `server-only` a proposito: el generador de schema y el script de alta la cargan fuera de
// Next. Quien la use en la aplicacion debe pasar por `auth.ts`, que si lo importa.

/** Maximo absoluto de una sesion desde el login: 30 dias (decision de producto aprobada). */
export const DURACION_MAXIMA_SESION_SEGUNDOS = 60 * 60 * 24 * 30

/** Vigencia del enlace de recuperacion: 1 hora (decision de producto aprobada, cierre de Auth). */
export const VIGENCIA_ENLACE_RECUPERACION_SEGUNDOS = 60 * 60

export type OpcionesAuth = {
  /**
   * Habilita el registro por email. SOLO para el proceso de alta de la Administradora
   * (modulos/autenticacion/aprovisionar-administradora.ts), que corre aparte, con un lock y
   * rechaza una segunda cuenta. La aplicacion nunca lo activa: sin registro publico.
   */
  permitirRegistro?: boolean
  /**
   * Como se entrega el correo de recuperacion. Por defecto Resend, configurado con
   * RESEND_API_KEY y RESEND_FROM. Las pruebas inyectan un reemplazo: nunca se envian correos reales.
   */
  enviarCorreo?: EnviarCorreo
  /**
   * Ejecuta una tarea despues de responder, sin esperarla. Evita que el pedido de recuperacion
   * tarde distinto segun el correo exista o no (lo que revelaria si la cuenta existe) y que un
   * fallo del proveedor llegue a la respuesta. La aplicacion usa `after` de Next (ver auth.ts).
   * Por defecto la deja correr sin esperarla.
   */
  ejecutarEnSegundoPlano?: (tarea: Promise<unknown>) => void
}

function ejecutarSinEsperar(tarea: Promise<unknown>): void {
  void tarea.catch(() => undefined)
}

export function crearAuth(db: NodePgDatabase, opciones: OpcionesAuth = {}) {
  return betterAuth({
    appName: "Angel Tears",
    // `secret` y `baseURL` salen de BETTER_AUTH_SECRET y BETTER_AUTH_URL (ver .env.example). El
    // enlace del correo se arma con esa URL base y no con datos de la solicitud.
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: esquemaAuth,
      // Consumo del token, cambio de credencial y revocacion de sesiones deben ser atomicos.
      transaction: true,
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: !opciones.permitirRegistro,
      // Dar de alta una cuenta nunca inicia sesion: el acceso es siempre un login explicito.
      autoSignIn: false,
      // Recuperacion (decisiones J1 a J4 y cierre de Auth 19/10): enlace de 1 hora y UN solo uso;
      // al restablecer se invalidan TODAS las sesiones y no se inicia sesion automaticamente.
      resetPasswordTokenExpiresIn: VIGENCIA_ENLACE_RECUPERACION_SEGUNDOS,
      revokeSessionsOnPasswordReset: true,
      // Better Auth genera y valida el token; aca solo se entrega el correo. Nunca lanza ni
      // registra la URL, el token ni el detalle del proveedor: la respuesta publica es siempre
      // la misma, llegue o no el mensaje.
      sendResetPassword: async ({ user, url }) => {
        try {
          const enviar = opciones.enviarCorreo ?? crearEnviadorDesdeEntorno()
          await enviar(construirCorreoRecuperacion({ para: user.email, url }))
        } catch (error) {
          console.error("[auth] no se pudo enviar el correo de recuperacion", {
            tipo: error instanceof Error ? error.name : typeof error,
            codigo: (error as { codigo?: unknown } | null)?.codigo,
          })
        }
      },
    },
    advanced: {
      backgroundTasks: { handler: opciones.ejecutarEnSegundoPlano ?? ejecutarSinEsperar },
      // Proteccion contra CSRF y redirecciones abiertas, fijada de forma EXPLICITA: Better Auth
      // las apaga por defecto cuando NODE_ENV=test, asi que sin esto los tests no las ejercitarian
      // y un entorno mal configurado podria dejarlas apagadas. `redirectTo` y `callbackURL` solo
      // aceptan rutas propias o origenes de confianza (la URL base).
      disableOriginCheck: false,
      disableCSRFCheck: false,
    },
    // Sesion (decisiones I4 y cierre de Auth 19/10): maximo ABSOLUTO de 30 dias desde el login.
    // Por defecto Better Auth renueva `expiresAt` cuando se usa la sesion pasado `updateAge`
    // (ventana deslizante); `disableSessionRefresh` lo impide, de modo que `expiresAt` queda
    // fijo en login + 30 dias aunque se use todos los dias, y al vencer hay que iniciar sesion
    // de nuevo. Sin `cookieCache`: cada solicitud consulta la sesion en la base, asi un logout o
    // un reset la invalidan al instante. La cookie la gestiona la libreria (HttpOnly,
    // SameSite=Lax, Secure en produccion) y dura lo mismo que la sesion.
    session: { expiresIn: DURACION_MAXIMA_SESION_SEGUNDOS, disableSessionRefresh: true },
    // Limite de intentos persistente (SEGURIDAD.md): una sola instancia en memoria no es una
    // garantia productiva. Se activa en todos los entornos (por defecto Better Auth solo lo
    // hace en produccion) para que desarrollo y pruebas ejerciten el mismo comportamiento.
    // Los valores (ventana y maximo) son los POR DEFECTO de Better Auth 1.7.11, sin valores
    // propios: no hay cifras de producto aprobadas. Sus reglas especiales por defecto cubren
    // /sign-in*, /sign-up*, /change-password* y /change-email* (3 por ventana de 10 s) y
    // /request-password-reset (3 por ventana de 60 s); el resto, 100 por 10 s. Cada ventana es
    // temporal, asi que nunca bloquea de forma indefinida a la unica administradora. Ver
    // docs/DESARROLLO.md.
    rateLimit: { enabled: true, storage: "database" },
  })
}
