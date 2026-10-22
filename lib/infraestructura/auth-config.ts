import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
// Ruta relativa a proposito: la herramienta que genera el schema no resuelve el alias `@/`.
import * as esquemaAuth from "./esquemas/auth"

// Configuracion de Better Auth (ADR-004). Se arma en una funcion para poder usarla con la base
// de la aplicacion, con la de pruebas y con la herramienta que genera el schema. No importa
// `server-only` a proposito: el generador de schema y el script de alta la cargan fuera de
// Next. Quien la use en la aplicacion debe pasar por `auth.ts`, que si lo importa.
//
// Esta tarea fija lo que cambia las tablas y el alta de la cuenta. Sesion de 30 dias, cookies,
// limites de intentos, reset de contrasena y correo se configuran en sus tareas (2.3, 2.5, 3.x).
/** Maximo absoluto de una sesion desde el login: 30 dias (decision de producto aprobada). */
export const DURACION_MAXIMA_SESION_SEGUNDOS = 60 * 60 * 24 * 30

export type OpcionesAuth = {
  /**
   * Habilita el registro por email. SOLO para el proceso de alta de la Administradora
   * (modulos/autenticacion/aprovisionar-administradora.ts), que corre aparte, con un lock y
   * rechaza una segunda cuenta. La aplicacion nunca lo activa: sin registro publico.
   */
  permitirRegistro?: boolean
}

export function crearAuth(db: NodePgDatabase, opciones: OpcionesAuth = {}) {
  return betterAuth({
    appName: "Angel Tears",
    // `secret` y `baseURL` salen de BETTER_AUTH_SECRET y BETTER_AUTH_URL (ver .env.example).
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
    // propios: no hay cifras de producto aprobadas. Cada ventana es temporal, asi que nunca
    // bloquea de forma indefinida a la unica administradora. Ver docs/DESARROLLO.md.
    rateLimit: { enabled: true, storage: "database" },
  })
}
