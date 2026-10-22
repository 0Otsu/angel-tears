import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { sql } from "drizzle-orm"
import { crearAuth } from "@/lib/infraestructura/auth-config"
import type { ConexionBd } from "@/lib/infraestructura/db"
import { crearConexionPruebas } from "@/pruebas/arnes-bd"

// Verifica contra PostgreSQL real que la migracion auth-base (aplicada por el globalSetup del
// proyecto "integracion") deja las tablas, indices y restricciones previstos en el blueprint, y
// que Better Auth funciona sobre ese schema. Solo toca filas con el prefijo de pruebas.

const PREFIJO = "prueba-auth-"
// Origen de aprovisionamiento que Better Auth 1.7 exige al crear un usuario por la via interna.
const ORIGEN_EMAIL = { method: "email-password" } as const

describe("schema de autenticacion en PostgreSQL", () => {
  let conexion: ConexionBd | undefined

  function bd() {
    if (!conexion) throw new Error("La conexion de pruebas no esta disponible.")
    return conexion.db
  }

  async function filas<T>(consulta: ReturnType<typeof sql>): Promise<T[]> {
    return (await bd().execute(consulta)).rows as T[]
  }

  beforeAll(() => {
    vi.stubEnv("BETTER_AUTH_SECRET", "secreto-solo-para-pruebas-0123456789abcdef")
    vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3100")
    conexion = crearConexionPruebas()
  })

  afterEach(async () => {
    // Las sesiones y cuentas se borran en cascada con el usuario.
    await conexion?.db.execute(sql`DELETE FROM "user" WHERE email LIKE ${PREFIJO + "%"}`)
  })

  afterAll(async () => {
    vi.unstubAllEnvs()
    await conexion?.pool.end()
  })

  it("crea las cinco tablas de Better Auth", async () => {
    const tablas = await filas<{ table_name: string }>(sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('user', 'session', 'account', 'verification', 'rate_limit')
      ORDER BY table_name`)

    expect(tablas.map((t) => t.table_name)).toEqual([
      "account",
      "rate_limit",
      "session",
      "user",
      "verification",
    ])
  })

  it("guarda las fechas de vencimiento con zona horaria", async () => {
    const columnas = await filas<{ table_name: string; column_name: string; data_type: string }>(sql`
      SELECT table_name, column_name, data_type FROM information_schema.columns
      WHERE table_schema = 'public'
        AND ((table_name = 'session' AND column_name IN ('expires_at', 'created_at', 'updated_at'))
          OR (table_name = 'verification' AND column_name IN ('expires_at', 'created_at', 'updated_at'))
          OR (table_name = 'user' AND column_name IN ('created_at', 'updated_at'))
          OR (table_name = 'account' AND column_name IN ('created_at', 'updated_at')))`)

    // session y verification: 3 fechas cada una; user y account: 2 cada una.
    expect(columnas).toHaveLength(10)
    for (const columna of columnas) {
      expect(columna.data_type, `${columna.table_name}.${columna.column_name}`).toBe(
        "timestamp with time zone",
      )
    }
  })

  it("define los indices y las unicidades del blueprint", async () => {
    const indices = await filas<{ indexname: string; indexdef: string }>(sql`
      SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public'`)
    const porNombre = new Map(indices.map((i) => [i.indexname, i.indexdef]))

    for (const nombre of [
      "session_userId_idx",
      "session_expiresAt_idx",
      "account_userId_idx",
      "verification_identifier_idx",
      "verification_expiresAt_idx",
    ]) {
      expect(porNombre.has(nombre), nombre).toBe(true)
    }
    for (const nombre of [
      "user_email_unique",
      "session_token_unique",
      "rate_limit_key_unique",
      "account_providerId_accountId_uidx",
    ]) {
      expect(porNombre.get(nombre), nombre).toContain("UNIQUE")
    }
  })

  it("borra sesiones y cuentas en cascada con el usuario", async () => {
    const auth = crearAuth(bd())
    const ctx = await auth.$context
    const usuario = await ctx.internalAdapter.createUser(
      { email: `${PREFIJO}cascada@ejemplo.com`, name: "Prueba", emailVerified: false },
      ORIGEN_EMAIL,
    )
    await ctx.internalAdapter.linkAccount({
      userId: usuario.id,
      providerId: "credential",
      accountId: usuario.id,
      password: await ctx.password.hash("una-contrasena-de-prueba-123"),
    })
    await ctx.internalAdapter.createSession(usuario.id)

    await bd().execute(sql`DELETE FROM "user" WHERE id = ${usuario.id}`)

    const [{ total }] = await filas<{ total: number }>(sql`
      SELECT (SELECT count(*) FROM session WHERE user_id = ${usuario.id})
           + (SELECT count(*) FROM account WHERE user_id = ${usuario.id}) AS total`)
    expect(Number(total)).toBe(0)
  })

  it("Better Auth crea y recupera usuario, cuenta y sesion sobre el schema", async () => {
    const auth = crearAuth(bd())
    const ctx = await auth.$context
    const email = `${PREFIJO}ida-y-vuelta@ejemplo.com`
    const usuario = await ctx.internalAdapter.createUser(
      { email, name: "Prueba", emailVerified: false },
      ORIGEN_EMAIL,
    )
    await ctx.internalAdapter.linkAccount({
      userId: usuario.id,
      providerId: "credential",
      accountId: usuario.id,
      password: await ctx.password.hash("una-contrasena-de-prueba-123"),
    })
    const sesion = await ctx.internalAdapter.createSession(usuario.id)

    const encontrado = await ctx.internalAdapter.findUserByEmail(email)
    const conSesion = await ctx.internalAdapter.findSession(sesion.token)
    const [cuenta] = await filas<{ password: string | null }>(sql`
      SELECT password FROM account WHERE user_id = ${usuario.id} AND provider_id = 'credential'`)

    expect(encontrado?.user.email).toBe(email)
    expect(conSesion?.user.id).toBe(usuario.id)
    expect(conSesion?.session.expiresAt.getTime()).toBeGreaterThan(Date.now())
    // La contrasena se guarda como hash, nunca en texto plano.
    expect(cuenta?.password).toBeTruthy()
    expect(cuenta?.password).not.toContain("una-contrasena-de-prueba-123")
  })

  it("rechaza dos usuarios con el mismo email", async () => {
    const auth = crearAuth(bd())
    const ctx = await auth.$context
    const email = `${PREFIJO}duplicado@ejemplo.com`
    await ctx.internalAdapter.createUser({ email, name: "Primera", emailVerified: false }, ORIGEN_EMAIL)

    await expect(
      ctx.internalAdapter.createUser({ email, name: "Segunda", emailVerified: false }, ORIGEN_EMAIL),
    ).rejects.toThrow()
  })

  it("no permite registrarse desde la API publica (signup deshabilitado)", async () => {
    const auth = crearAuth(bd())
    const email = `${PREFIJO}registro@ejemplo.com`

    await expect(
      auth.api.signUpEmail({
        body: { email, password: "una-contrasena-de-prueba-123", name: "Intruso" },
      }),
    ).rejects.toThrow()

    const usuarios = await filas<{ id: string }>(sql`SELECT id FROM "user" WHERE email = ${email}`)
    expect(usuarios).toHaveLength(0)
  })
})
