import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import { crearEnviadorDesdeEntorno, type EnviarCorreo } from "./correo"
// Ruta relativa a proposito: la herramienta que genera el schema no resuelve el alias `@/`.
import * as esquemaAuth from "./esquemas/auth"
import { construirCorreoRecuperacion } from "../modulos/autenticacion/correo-recuperacion"
import { isIP } from "node:net"
import { reservarIntentoRecuperacion } from "./cuota-recuperacion"

// Configuracion de Better Auth (ADR-004). Se arma en una funcion para poder usarla con la base
// de la aplicacion, con la de pruebas y con la herramienta que genera el schema. No importa
// `server-only` a proposito: el generador de schema y el script de alta la cargan fuera de
// Next. Quien la use en la aplicacion debe pasar por `auth.ts`, que si lo importa.

/** Maximo absoluto de una sesion desde el login: 30 dias (decision de producto aprobada). */
export const DURACION_MAXIMA_SESION_SEGUNDOS = 60 * 60 * 24 * 30

/** Vigencia del enlace de recuperacion: 1 hora (decision de producto aprobada, cierre de Auth). */
export const VIGENCIA_ENLACE_RECUPERACION_SEGUNDOS = 60 * 60

export type OpcionesAuth = {
  web?: { origen: string; cabecerasIp: string[] }
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

export function leerConfiguracionAuthWeb(entorno: { BETTER_AUTH_URL?: string; BETTER_AUTH_TRUSTED_IP_HEADER?: string }): NonNullable<OpcionesAuth["web"]> {
  let url: URL
  try {
    url = new URL(entorno.BETTER_AUTH_URL ?? "")
  } catch {
    throw new Error("BETTER_AUTH_URL debe ser el origen de la aplicación.")
  }
  const host = url.hostname
  const loopback = host === "localhost" || host === "[::1]" || isIP(host) === 4 && host.startsWith("127.")
  if (!(url.protocol === "https:" || url.protocol === "http:" && loopback)
    || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("BETTER_AUTH_URL debe ser un origen HTTPS o una dirección de desarrollo local.")
  }
  const cabecera = entorno.BETTER_AUTH_TRUSTED_IP_HEADER?.trim().toLowerCase()
  if (cabecera && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cabecera)) {
    throw new Error("BETTER_AUTH_TRUSTED_IP_HEADER debe identificar una sola cabecera HTTP.")
  }
  return { origen: url.origin, cabecerasIp: cabecera ? [cabecera] : [] }
}

function ejecutarSinEsperar(tarea: Promise<unknown>): void {
  void tarea.catch(() => undefined)
}

export function crearAuth(db: NodePgDatabase, opciones: OpcionesAuth = {}) {
  return betterAuth({
    appName: "Angel Tears",
    // En la aplicación web el origen es obligatorio y explícito. Las herramientas locales
    // y las pruebas que llaman al factory usan su propia configuración de Better Auth.
    ...(opciones.web && { baseURL: opciones.web.origen }),
    // La identidad administrativa es de solo lectura. disabledPaths afecta solo al router HTTP.
    disabledPaths: ["/update-user"],
    // El logger nativo puede recibir mensajes o excepciones completas, incluidos SQL y datos.
    logger: { log: (nivel) => {
      if (nivel === "warn" || nivel === "error") console.warn("[auth] diagnóstico de Better Auth", { nivel })
    } },
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
          // Solo se llega aquí para un usuario encontrado por Better Auth. La reserva es
          // global y corre en segundo plano junto con el envío. Si falla, no se llama a Resend.
          if (!await reservarIntentoRecuperacion(db)) return
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
      // Sin una cabecera verificada, Better Auth usa un límite compartido por ruta.
      ...(opciones.web && { ipAddress: { ipAddressHeaders: opciones.web.cabecerasIp } }),
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
    // Se fija la regla de recuperación por IP que ya aplicaba Better Auth. La cuota de
    // entregas se controla aparte. Login y demás rutas conservan las reglas de la librería.
    rateLimit: {
      enabled: true,
      storage: "database",
      customRules: { "/request-password-reset": { window: 60, max: 3 } },
    },
  })
}
