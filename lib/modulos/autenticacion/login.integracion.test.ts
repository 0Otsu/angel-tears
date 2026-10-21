import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { sql } from "drizzle-orm"
import { crearAuth } from "@/lib/infraestructura/auth-config"
import { atenderSolicitudAuth } from "@/lib/infraestructura/auth-manejador"
import { crearConexionBd, type ConexionBd } from "@/lib/infraestructura/conexion-bd"
import { aprovisionarAdministradora } from "@/lib/modulos/autenticacion/aprovisionar-administradora"
import { crearConexionPruebas } from "@/pruebas/arnes-bd"

// Login real (tarea 2.3) contra PostgreSQL: se ejercita el mismo handler HTTP que monta
// app/api/auth/[...all]/route.ts, con solicitudes reales (Request/Response).

const ORIGEN = "http://localhost:3100"
const EMAIL = "admin@ejemplo.com"
const CONTRASENA = "una-contrasena-de-prueba-123"
const CONTRASENA_ERRONEA = "contrasena-equivocada-999"

type RespuestaJson = { status: number; cabeceras: Headers; cuerpo: string; json: Record<string, unknown> | null }

describe("login con email y contrasena", () => {
  let conexion: ConexionBd | undefined
  let salidas: string[] = []

  function con() {
    if (!conexion) throw new Error("La conexion de pruebas no esta disponible.")
    return conexion
  }

  async function filas<T>(consulta: ReturnType<typeof sql>): Promise<T[]> {
    return (await con().db.execute(consulta)).rows as T[]
  }

  async function contarSesiones(): Promise<number> {
    const [{ total }] = await filas<{ total: number }>(sql`SELECT count(*)::int AS total FROM session`)
    return total
  }

  // Envia una solicitud al handler. `ip` simula el cliente detras de un proxy.
  async function iniciarSesion(
    cuerpo: string,
    opciones: { ip?: string; db?: ConexionBd["db"] } = {},
  ): Promise<RespuestaJson> {
    const auth = crearAuth(opciones.db ?? con().db)
    const encabezados: Record<string, string> = { "content-type": "application/json", origin: ORIGEN }
    if (opciones.ip) encabezados["x-forwarded-for"] = opciones.ip
    // Mismo camino que app/api/auth/[...all]/route.ts: handler de Better Auth dentro del envoltorio seguro.
    const solicitud = new Request(`${ORIGEN}/api/auth/sign-in/email`, { method: "POST", headers: encabezados, body: cuerpo })
    const respuesta = await atenderSolicitudAuth(() => auth.handler(solicitud))
    const texto = await respuesta.text()
    let json: Record<string, unknown> | null = null
    try {
      json = JSON.parse(texto) as Record<string, unknown>
    } catch {
      json = null
    }
    return { status: respuesta.status, cabeceras: respuesta.headers, cuerpo: texto, json }
  }

  const credenciales = (email: string, password: string) => JSON.stringify({ email, password })

  beforeAll(() => {
    vi.stubEnv("BETTER_AUTH_SECRET", "secreto-solo-para-pruebas-0123456789abcdef")
    vi.stubEnv("BETTER_AUTH_URL", ORIGEN)
    conexion = crearConexionPruebas()
  })

  beforeEach(async () => {
    await con().db.execute(sql`DELETE FROM "user"`)
    await con().db.execute(sql`DELETE FROM rate_limit`)
    await aprovisionarAdministradora(con(), { email: EMAIL, nombre: "Sofia", contrasena: CONTRASENA })
    // Captura lo que la libreria o el codigo escriban en consola, para revisar que no filtre secretos.
    salidas = []
    for (const metodo of ["log", "info", "warn", "error", "debug"] as const) {
      vi.spyOn(console, metodo).mockImplementation((...args: unknown[]) => {
        salidas.push(args.map((a) => (a instanceof Error ? `${a.message}\n${a.stack}` : JSON.stringify(a) ?? String(a))).join(" "))
      })
    }
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await conexion?.db.execute(sql`DELETE FROM "user"`)
    await conexion?.db.execute(sql`DELETE FROM rate_limit`)
  })

  afterAll(async () => {
    vi.unstubAllEnvs()
    await conexion?.pool.end()
  })

  it("con credenciales correctas abre una sesion con una cookie HttpOnly", async () => {
    const [{ password: hash }] = await filas<{ password: string }>(
      sql`SELECT password FROM account WHERE provider_id = 'credential'`,
    )

    const r = await iniciarSesion(credenciales(EMAIL, CONTRASENA))

    expect(r.status).toBe(200)
    const cookie = r.cabeceras.get("set-cookie") ?? ""
    expect(cookie).toContain("session_token")
    expect(cookie).toContain("HttpOnly")
    expect(cookie).toMatch(/SameSite=Lax/i)
    expect(await contarSesiones()).toBe(1)
    // La respuesta no expone la contrasena ni su hash.
    expect(r.cuerpo).not.toContain(CONTRASENA)
    expect(r.cuerpo).not.toContain(hash)
    expect((r.json?.user as { email?: string })?.email).toBe(EMAIL)
  })

  it("con contrasena incorrecta responde un error neutro y no abre sesion", async () => {
    const r = await iniciarSesion(credenciales(EMAIL, CONTRASENA_ERRONEA))

    expect(r.status).toBe(401)
    expect(r.json?.code).toBe("INVALID_EMAIL_OR_PASSWORD")
    expect(r.cabeceras.get("set-cookie")).toBeNull()
    expect(await contarSesiones()).toBe(0)
  })

  it("responde igual para un email que no existe (no revela si la cuenta existe)", async () => {
    const conCuenta = await iniciarSesion(credenciales(EMAIL, CONTRASENA_ERRONEA))
    const sinCuenta = await iniciarSesion(credenciales("nadie@ejemplo.com", CONTRASENA_ERRONEA))

    expect(sinCuenta.status).toBe(conCuenta.status)
    expect(sinCuenta.json).toEqual(conCuenta.json)
    expect(sinCuenta.cabeceras.get("set-cookie")).toBeNull()
  })

  it("rechaza entradas mal formadas sin error del servidor, sin sesion y sin detalle interno", async () => {
    const casos = [
      "esto no es json",
      "",
      JSON.stringify({}),
      JSON.stringify({ email: EMAIL }),
      JSON.stringify({ password: CONTRASENA }),
      JSON.stringify({ email: "no-es-un-email", password: CONTRASENA }),
      JSON.stringify({ email: 123, password: ["x"] }),
    ]

    for (const cuerpo of casos) {
      const r = await iniciarSesion(cuerpo)
      expect(r.status, cuerpo).toBeGreaterThanOrEqual(400)
      expect(r.status, cuerpo).toBeLessThan(500)
      expect(r.cabeceras.get("set-cookie"), cuerpo).toBeNull()
      expect(r.cuerpo, cuerpo).not.toMatch(/stack|node_modules|\bat\s.+\(.+:\d+:\d+\)|select\s/i)
    }
    expect(await contarSesiones()).toBe(0)
  })

  it("limita los intentos repetidos sin revelar la cuenta", async () => {
    const ip = "203.0.113.10"
    const respuestas: RespuestaJson[] = []
    for (let i = 0; i < 5; i++) {
      respuestas.push(await iniciarSesion(credenciales(EMAIL, CONTRASENA_ERRONEA), { ip }))
    }

    const estados = respuestas.map((r) => r.status)
    expect(estados).toContain(429)
    expect(estados.indexOf(429)).toBeGreaterThan(0) // los primeros intentos si se procesan
    expect(estados.slice(0, estados.indexOf(429)).every((e) => e === 401)).toBe(true)
    const limitada = respuestas[estados.indexOf(429)]
    expect(limitada.cuerpo).not.toContain(EMAIL)
    expect(limitada.cabeceras.get("set-cookie")).toBeNull()
  })

  it("el limite es temporal: al vencer la ventana vuelve a permitir intentos y el login correcto", async () => {
    const ip = "203.0.113.20"
    let limitado = false
    for (let i = 0; i < 6 && !limitado; i++) {
      limitado = (await iniciarSesion(credenciales(EMAIL, CONTRASENA_ERRONEA), { ip })).status === 429
    }
    expect(limitado).toBe(true)

    // Se simula que pasaron unos minutos moviendo hacia atras el ultimo intento registrado.
    await con().db.execute(sql`UPDATE rate_limit SET last_request = last_request - 600000`)

    const otravez = await iniciarSesion(credenciales(EMAIL, CONTRASENA_ERRONEA), { ip })
    expect(otravez.status).toBe(401)
    const correcto = await iniciarSesion(credenciales(EMAIL, CONTRASENA), { ip })
    expect(correcto.status).toBe(200)
  })

  it("con la base de datos caida responde un error generico sin SQL, trazas ni secretos", async () => {
    const marcador = "marcador-de-contrasena-de-la-base"
    // Puerto 1: nadie escucha, la conexion es rechazada de inmediato.
    const caida = crearConexionBd(`postgresql://angel_tears:${marcador}@localhost:1/angel_tears_test`)
    try {
      const r = await iniciarSesion(credenciales(EMAIL, CONTRASENA), { db: caida.db })

      expect(r.status).toBe(503)
      expect(r.json?.code).toBe("SERVICIO_NO_DISPONIBLE")
      expect(r.cabeceras.get("set-cookie")).toBeNull()
      for (const texto of [r.cuerpo, ...salidas]) {
        expect(texto).not.toContain(marcador)
        expect(texto).not.toContain(CONTRASENA)
      }
      expect(r.cuerpo).not.toMatch(/stack|node_modules|ECONNREFUSED|localhost|select\s|\bat\s.+\(.+:\d+:\d+\)/i)
    } finally {
      await caida.pool.end()
    }
  }, 20_000)

  it("no escribe la contrasena ni el secreto de la libreria en los logs", async () => {
    await iniciarSesion(credenciales(EMAIL, CONTRASENA_ERRONEA))
    await iniciarSesion(credenciales(EMAIL, CONTRASENA))
    await iniciarSesion("esto no es json")

    const todo = salidas.join("\n")
    for (const secreto of [CONTRASENA, CONTRASENA_ERRONEA, "secreto-solo-para-pruebas-0123456789abcdef"]) {
      expect(todo).not.toContain(secreto)
    }
  })
})
