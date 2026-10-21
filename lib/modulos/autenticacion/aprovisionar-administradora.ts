import { z } from "zod"
import { crearAuth } from "@/lib/infraestructura/auth-config"
import type { ConexionBd } from "@/lib/infraestructura/conexion-bd"

// Alta controlada de la unica Administradora (ADR-004, tarea 2.2). NO es una pagina ni un
// endpoint: lo ejecuta una persona desde el script scripts/auth/crear-administradora.ts, nunca
// la aplicacion. Ninguna ruta, Server Action ni componente debe importar este modulo (hay una
// prueba que lo verifica).
//
// Garantias:
//  - Una sola cuenta: con un lock exclusivo de PostgreSQL se comprueba que no exista ningun
//    usuario y se crea, de modo que dos ejecuciones simultaneas no pueden crear dos cuentas.
//  - Idempotente y seguro: si ya existe una cuenta no se crea otra ni se toca la existente
//    (ni su contrasena), sea cual sea el email recibido.
//  - Sin criptografia propia: el hash de la contrasena y la creacion del usuario los hace
//    Better Auth. El registro solo se habilita en la instancia de este proceso.
//  - La contrasena nunca se devuelve, se imprime ni se incluye en mensajes de error.

const esquemaDatos = z.object({
  email: z
    .string({ error: "El email es obligatorio." })
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: "El email no tiene un formato valido." })),
  nombre: z
    .string({ error: "El nombre es obligatorio." })
    .trim()
    .min(1, { error: "El nombre es obligatorio." })
    .max(100, { error: "El nombre admite hasta 100 caracteres." }),
  contrasena: z
    .string({ error: "La contrasena es obligatoria." })
    .min(8, { error: "La contrasena debe tener al menos 8 caracteres." })
    .max(128, { error: "La contrasena admite hasta 128 caracteres." }),
})

export type ErrorDeCampo = { campo: "email" | "nombre" | "contrasena"; mensaje: string }

export type ResultadoAprovisionamiento =
  | { estado: "creada"; email: string }
  | { estado: "ya_existe" }
  | { estado: "datos_invalidos"; errores: ErrorDeCampo[] }

// Clave del lock. El nombre es fijo para que todos los procesos compitan por el mismo.
const CLAVE_DE_BLOQUEO = "angel-tears:aprovisionar-administradora"

export async function aprovisionarAdministradora(
  conexion: ConexionBd,
  datos: unknown,
): Promise<ResultadoAprovisionamiento> {
  const validacion = esquemaDatos.safeParse(datos)
  if (!validacion.success) {
    return {
      estado: "datos_invalidos",
      errores: validacion.error.issues.map((problema) => ({
        campo: String(problema.path[0]) as ErrorDeCampo["campo"],
        mensaje: problema.message,
      })),
    }
  }
  const { email, nombre, contrasena } = validacion.data

  // El lock es de sesion y vive en una conexion propia: lo toman las demas ejecuciones y
  // esperan hasta que esta termine, aunque la creacion use otras conexiones del pool.
  const cliente = await conexion.pool.connect()
  try {
    await cliente.query("SELECT pg_advisory_lock(hashtext($1))", [CLAVE_DE_BLOQUEO])
    try {
      const existentes = await cliente.query('SELECT 1 FROM "user" LIMIT 1')
      if (existentes.rows.length > 0) {
        return { estado: "ya_existe" }
      }
      const auth = crearAuth(conexion.db, { permitirRegistro: true })
      await auth.api.signUpEmail({ body: { email, password: contrasena, name: nombre } })
      return { estado: "creada", email }
    } finally {
      await cliente.query("SELECT pg_advisory_unlock(hashtext($1))", [CLAVE_DE_BLOQUEO])
    }
  } finally {
    cliente.release()
  }
}
