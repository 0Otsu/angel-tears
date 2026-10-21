import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
// Ruta relativa a proposito: la herramienta que genera el schema no resuelve el alias `@/`.
import * as esquemaAuth from "./esquemas/auth"

// Configuracion de Better Auth (ADR-004). Se arma en una funcion para poder usarla con la base
// de la aplicacion, con la de pruebas y con la herramienta que genera el schema. No importa
// `server-only` a proposito: el generador de schema la carga fuera de Next. Quien la use en la
// aplicacion debe pasar por `auth.ts`, que si lo importa.
//
// Esta tarea (2.1) fija solo lo que cambia las tablas. Sesion de 30 dias, cookies, limites de
// intentos, reset de contrasena y correo se configuran en sus tareas (2.3, 2.5, 3.x).
export function crearAuth(db: NodePgDatabase) {
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
      // No hay registro publico: la unica cuenta se crea con el script de alta (tarea 2.2).
      disableSignUp: true,
    },
    // Limite de intentos persistente: una sola instancia en memoria no es una garantia
    // productiva (SEGURIDAD.md). Cambia el schema, por eso se fija ahora; los valores, en 2.3.
    rateLimit: { storage: "database" },
  })
}
