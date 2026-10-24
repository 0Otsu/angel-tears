import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { sql } from "drizzle-orm"
import { crearAuth } from "@/lib/infraestructura/auth-config"
import { atenderSolicitudAuth } from "@/lib/infraestructura/auth-manejador"
import type { ConexionBd } from "@/lib/infraestructura/conexion-bd"
import { ErrorEnvioCorreo, type MensajeCorreo } from "@/lib/infraestructura/correo"
import { aprovisionarAdministradora } from "@/lib/modulos/autenticacion/aprovisionar-administradora"
import { crearConexionPruebas } from "@/pruebas/arnes-bd"

// Recuperacion de contrasena por email (tareas 3.1 y 3.2) contra el handler real de Better Auth y
// PostgreSQL, con un REEMPLAZO del proveedor de correo: ningun test envia correos reales.

const ORIGEN = "http://localhost:3100"
const EMAIL = "admin@ejemplo.com"
const ACTUAL = "una-contrasena-de-prueba-123"
const NUEVA = "contrasena-nueva-de-prueba-456"
const OTRA = "otra-contrasena-nueva-789"
const HORA_MS = 60 * 60 * 1000

describe("recuperacion de contrasena por email", () => {
  let conexion: ConexionBd | undefined
  let correos: MensajeCorreo[] = []
  let pendientes: Promise<unknown>[] = []
  let salidas: string[] = []
  let falloDelProveedor: Error | null = null
  let demoraDelProveedorMs = 0

  function con() {
    if (!conexion) throw new Error("La conexion de pruebas no esta disponible.")
    return conexion
  }

  // Instancia con el proveedor de correo reemplazado y el "segundo plano" capturado.
  const auth = () =>
    crearAuth(con().db, {
      enviarCorreo: async (mensaje) => {
        if (demoraDelProveedorMs) await new Promise((r) => setTimeout(r, demoraDelProveedorMs))
        if (falloDelProveedor) throw falloDelProveedor
        correos.push(mensaje)
      },
      ejecutarEnSegundoPlano: (tarea) => {
        pendientes.push(tarea)
      },
    })

  const esperarEnvios = async () => {
    await Promise.all(pendientes.splice(0))
  }

  async function filas<T>(consulta: ReturnType<typeof sql>): Promise<T[]> {
    return (await con().db.execute(consulta)).rows as T[]
  }

  type Respuesta = { status: number; cuerpo: string; json: Record<string, unknown> | null; cabeceras: Headers }

  async function enviar(ruta: string, init: RequestInit, instancia = auth()): Promise<Respuesta> {
    const r = await atenderSolicitudAuth(() => instancia.handler(new Request(`${ORIGEN}${ruta}`, init)))
    const cuerpo = await r.text()
    let json: Record<string, unknown> | null = null
    try {
      json = JSON.parse(cuerpo) as Record<string, unknown>
    } catch {
      json = null
    }
    return { status: r.status, cuerpo, json, cabeceras: r.headers }
  }

  const post = (ruta: string, cuerpo: unknown, extra: Record<string, string> = {}, instancia = auth()) =>
    enviar(
      ruta,
      {
        method: "POST",
        headers: { "content-type": "application/json", origin: ORIGEN, ...extra },
        body: JSON.stringify(cuerpo),
      },
      instancia,
    )

  const solicitar = (email: string, extra: Record<string, string> = {}, redirectTo = "/admin/restablecer") =>
    post("/api/auth/request-password-reset", { email, redirectTo }, extra)

  const restablecer = (token: string, newPassword: string) => post("/api/auth/reset-password", { token, newPassword })

  const tokenDe = (mensaje: MensajeCorreo) => /reset-password\/([A-Za-z0-9_-]+)/.exec(mensaje.texto)?.[1] ?? ""

  async function pedirEnlace(email = EMAIL): Promise<string> {
    correos = []
    const r = await solicitar(email)
    expect(r.status).toBe(200)
    await esperarEnvios()
    expect(correos).toHaveLength(1)
    return tokenDe(correos[0])
  }

  async function iniciarSesion(contrasena = ACTUAL): Promise<number> {
    // El limite de intentos del login (3 por 10 s) cortaria varios logins seguidos de un mismo test.
    await con().db.execute(sql`DELETE FROM rate_limit`)
    const r = await post("/api/auth/sign-in/email", { email: EMAIL, password: contrasena })
    return r.status
  }

  async function contrasenaVale(contrasena: string): Promise<boolean> {
    const ctx = await auth().$context
    const [{ password }] = await filas<{ password: string }>(sql`SELECT password FROM account WHERE provider_id = 'credential'`)
    return ctx.password.verify({ hash: password, password: contrasena })
  }

  async function contar(tabla: "session" | "verification"): Promise<number> {
    const [{ total }] = await filas<{ total: number }>(sql`SELECT count(*)::int AS total FROM ${sql.identifier(tabla)}`)
    return total
  }

  beforeAll(() => {
    vi.stubEnv("BETTER_AUTH_SECRET", "secreto-solo-para-pruebas-0123456789abcdef")
    vi.stubEnv("BETTER_AUTH_URL", ORIGEN)
    // Sin configuracion de Resend: nada de esta suite puede depender del proveedor real.
    vi.stubEnv("RESEND_API_KEY", "")
    vi.stubEnv("RESEND_FROM", "")
    conexion = crearConexionPruebas()
  })

  beforeEach(async () => {
    await con().db.execute(sql`DELETE FROM "user"`)
    await con().db.execute(sql`DELETE FROM verification`)
    await con().db.execute(sql`DELETE FROM rate_limit`)
    await aprovisionarAdministradora(con(), { email: EMAIL, nombre: "Sofia", contrasena: ACTUAL })
    correos = []
    pendientes = []
    salidas = []
    falloDelProveedor = null
    demoraDelProveedorMs = 0
    for (const metodo of ["log", "info", "warn", "error", "debug"] as const) {
      vi.spyOn(console, metodo).mockImplementation((...args: unknown[]) => {
        salidas.push(args.map((a) => (a instanceof Error ? `${a.message}\n${a.stack}` : (JSON.stringify(a) ?? String(a)))).join(" "))
      })
    }
  })

  afterEach(async () => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    await conexion?.db.execute(sql`DROP TRIGGER IF EXISTS prueba_fallar_borrado ON session`)
    await conexion?.db.execute(sql`DROP FUNCTION IF EXISTS prueba_fallar_borrado_sesion()`)
    await conexion?.db.execute(sql`DELETE FROM "user"`)
    await conexion?.db.execute(sql`DELETE FROM verification`)
    await conexion?.db.execute(sql`DELETE FROM rate_limit`)
  })

  afterAll(async () => {
    vi.unstubAllEnvs()
    await conexion?.pool.end()
  })

  describe("pedido del enlace y envio del correo (3.1)", () => {
    it("envia el correo con un enlace a la URL base confiable y responde de forma neutra", async () => {
      const r = await solicitar(EMAIL)
      await esperarEnvios()

      expect(r.status).toBe(200)
      expect(correos).toHaveLength(1)
      expect(correos[0].para).toBe(EMAIL)
      const enlace = /https?:\/\/\S+/.exec(correos[0].texto)?.[0] ?? ""
      expect(enlace.startsWith(`${ORIGEN}/api/auth/reset-password/`)).toBe(true)
      expect(correos[0].texto).toContain("1 hora")
      expect(correos[0].html).toContain("href=")
    })

    it("el enlace usa siempre la URL base configurada, aunque la solicitud traiga otro host", async () => {
      await solicitar(EMAIL, { "x-forwarded-host": "sitio-malicioso.example", host: "sitio-malicioso.example" })
      await esperarEnvios()

      expect(correos).toHaveLength(1)
      expect(correos[0].texto).not.toContain("sitio-malicioso")
      expect(correos[0].html).not.toContain("sitio-malicioso")
    })

    it("responde igual para un email que no existe y no envia ningun correo", async () => {
      const existente = await solicitar(EMAIL)
      await esperarEnvios()
      correos = []

      const inexistente = await solicitar("nadie@ejemplo.com")
      await esperarEnvios()

      expect(inexistente.status).toBe(existente.status)
      expect(inexistente.json).toEqual(existente.json)
      expect(correos).toHaveLength(0)
    })

    it("si el proveedor falla, la respuesta publica sigue siendo la misma y no se filtra nada", async () => {
      const referencia = await solicitar("nadie@ejemplo.com")
      falloDelProveedor = new ErrorEnvioCorreo("rate_limit_exceeded")

      const r = await solicitar(EMAIL)
      await esperarEnvios()

      expect(r.status).toBe(referencia.status)
      expect(r.json).toEqual(referencia.json)
      const todo = [r.cuerpo, ...salidas].join("\n")
      expect(todo).not.toMatch(/reset-password|token|callbackURL|https?:\/\//i)
      expect(todo).not.toContain(EMAIL) // ni siquiera el correo de la cuenta
      expect(salidas.join("\n")).toContain("no se pudo enviar el correo")
    })

    it("sin configuracion de Resend tampoco se rompe ni se filtra: respuesta neutra y aviso sin valores", async () => {
      // La instancia por defecto usa Resend y, sin RESEND_API_KEY ni RESEND_FROM, no puede enviar.
      const sinEnviadorInyectado = crearAuth(con().db, { ejecutarEnSegundoPlano: (t) => void pendientes.push(t) })

      const r = await post("/api/auth/request-password-reset", { email: EMAIL, redirectTo: "/admin/restablecer" }, {}, sinEnviadorInyectado)
      await esperarEnvios()

      expect(r.status).toBe(200)
      expect(salidas.join("\n")).toContain("no se pudo enviar el correo")
      expect(salidas.join("\n")).not.toMatch(/reset-password|https?:\/\//i)
    })

    it("el pedido no espera al proveedor: no tarda mas cuando la cuenta existe (no revela si existe)", async () => {
      demoraDelProveedorMs = 1000

      const inicio = performance.now()
      const r = await solicitar(EMAIL)
      const duracion = performance.now() - inicio

      expect(r.status).toBe(200)
      expect(duracion).toBeLessThan(700) // el envio simulado tarda 1000 ms y sigue en segundo plano
      await esperarEnvios()
      expect(correos).toHaveLength(1) // el correo igual se envia
    })

    it("rechaza un redirectTo hacia otro origen y no envia nada (sin redireccion abierta)", async () => {
      for (const destino of ["https://sitio-malicioso.example/robar", "//sitio-malicioso.example", "javascript:alert(1)"]) {
        const r = await solicitar(EMAIL, {}, destino)
        await esperarEnvios()

        expect(r.status, destino).toBeGreaterThanOrEqual(400)
        expect(r.status, destino).toBeLessThan(500)
      }
      expect(correos).toHaveLength(0)
    })

    it("con una sesion abierta, un pedido que cambia estado desde otro origen se rechaza (CSRF)", async () => {
      const login = await post("/api/auth/sign-in/email", { email: EMAIL, password: ACTUAL })
      const cookie = (login.cabeceras.getSetCookie().find((c) => c.includes("session_token")) ?? "").split(";")[0]
      expect(cookie).not.toBe("")

      const r = await enviar("/api/auth/sign-out", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "https://sitio-malicioso.example", cookie },
        body: "{}",
      })

      expect(r.status).toBe(403)
      expect(await contar("session")).toBe(1) // la sesion no se cerro
    })
    it("limita los pedidos repetidos (3 por minuto por IP, valor por defecto de la libreria)", async () => {
      const estados: number[] = []
      for (let i = 0; i < 5; i++) estados.push((await solicitar(EMAIL, { "x-forwarded-for": "203.0.113.70" })).status)

      expect(estados.slice(0, 3)).toEqual([200, 200, 200])
      expect(estados.slice(3)).toEqual([429, 429])
    })
  })

  describe("restablecimiento de la contrasena (3.2)", () => {
    it("restablece la contrasena, cierra TODAS las sesiones y no inicia sesion automaticamente", async () => {
      expect(await iniciarSesion()).toBe(200)
      expect(await iniciarSesion()).toBe(200)
      expect(await contar("session")).toBe(2)
      const token = await pedirEnlace()

      const r = await restablecer(token, NUEVA)

      expect(r.status).toBe(200)
      expect(await contar("session")).toBe(0) // todas cerradas y ninguna nueva (sin auto-login)
      expect(r.cabeceras.get("set-cookie")).toBeNull()
      expect(await contrasenaVale(NUEVA)).toBe(true)
      expect(await contrasenaVale(ACTUAL)).toBe(false)
      expect(await iniciarSesion(ACTUAL)).toBe(401)
      expect(await iniciarSesion(NUEVA)).toBe(200)
    })

    it("el enlace sirve una sola vez", async () => {
      const token = await pedirEnlace()

      const primero = await restablecer(token, NUEVA)
      const segundo = await restablecer(token, OTRA)

      expect(primero.status).toBe(200)
      expect(segundo.status).toBe(400)
      expect(segundo.json?.code).toBe("INVALID_TOKEN")
      expect(await contrasenaVale(NUEVA)).toBe(true) // el segundo intento no cambio nada
    })

    it("un token inexistente o mal formado no cambia nada", async () => {
      for (const token of ["token-que-no-existe", "", "x".repeat(500)]) {
        const r = await restablecer(token, NUEVA)
        expect(r.status, token.slice(0, 12)).toBeGreaterThanOrEqual(400)
        expect(r.status, token.slice(0, 12)).toBeLessThan(500)
      }
      expect(await contrasenaVale(ACTUAL)).toBe(true)
    })

    it("vale antes de la hora y vence despues; en el instante exacto sigue valiendo (comparacion estricta de la libreria)", async () => {
      vi.useFakeTimers({ toFake: ["Date"] })
      const inicio = new Date("2026-11-02T12:00:00.000Z")
      vi.setSystemTime(inicio)
      const token = await pedirEnlace()

      vi.setSystemTime(inicio.getTime() + HORA_MS + 1000)
      const vencido = await restablecer(token, NUEVA)
      expect(vencido.status).toBe(400)
      expect(vencido.json?.code).toBe("INVALID_TOKEN")
      expect(await contrasenaVale(ACTUAL)).toBe(true)

      // Un enlace nuevo, usado un segundo antes del limite, todavia vale.
      vi.setSystemTime(new Date("2026-11-03T12:00:00.000Z"))
      const otro = await pedirEnlace()
      vi.setSystemTime(new Date("2026-11-03T12:00:00.000Z").getTime() + HORA_MS - 1000)
      expect((await restablecer(otro, NUEVA)).status).toBe(200)
    })

    it("el instante exacto de la hora todavia vale (la libreria compara con 'menor que'): diferencia de 1 ms documentada", async () => {
      vi.useFakeTimers({ toFake: ["Date"] })
      const inicio = new Date("2026-11-02T12:00:00.000Z")
      vi.setSystemTime(inicio)
      const token = await pedirEnlace()

      vi.setSystemTime(inicio.getTime() + HORA_MS)
      const enElLimite = await restablecer(token, NUEVA)
      expect(enElLimite.status).toBe(200)
    })

    it("el callback del enlace redirige al formulario con el token, o con error si es invalido o vencio", async () => {
      const token = await pedirEnlace()
      const callback = (t: string) =>
        enviar(`/api/auth/reset-password/${t}?callbackURL=${encodeURIComponent("/admin/restablecer")}`, {
          method: "GET",
          headers: { origin: ORIGEN },
          redirect: "manual",
        })

      const valido = await callback(token)
      const invalido = await callback("token-inexistente")

      expect(valido.status).toBe(302)
      expect(valido.cabeceras.get("location")).toContain(`/admin/restablecer?token=${token}`)
      expect(invalido.status).toBe(302)
      expect(invalido.cabeceras.get("location")).toContain("error=INVALID_TOKEN")
      expect(invalido.cabeceras.get("location")).not.toContain("token=")
    })

    it("una contrasena nueva rechazada no consume el enlace: se puede reintentar con otra", async () => {
      const token = await pedirEnlace()

      const corta = await restablecer(token, "corta")
      const larga = await restablecer(token, "a".repeat(129))

      expect(corta.status).toBe(400)
      expect(larga.status).toBe(400)
      expect(await contrasenaVale(ACTUAL)).toBe(true)
      expect((await restablecer(token, NUEVA)).status).toBe(200) // el mismo enlace sigue sirviendo
    })

    it("con dos intentos simultaneos con el mismo enlace solo uno restablece", async () => {
      const token = await pedirEnlace()

      const [a, b] = await Promise.all([restablecer(token, NUEVA), restablecer(token, OTRA)])

      expect([a.status, b.status].sort()).toEqual([200, 400])
      const ganador = a.status === 200 ? NUEVA : OTRA
      const perdedor = a.status === 200 ? OTRA : NUEVA
      expect(await contrasenaVale(ganador)).toBe(true)
      expect(await contrasenaVale(perdedor)).toBe(false)
    })

    it("si algo falla a mitad del restablecimiento se revierte todo: contrasena, sesiones y enlace quedan como estaban", async () => {
      expect(await iniciarSesion()).toBe(200)
      const token = await pedirEnlace()
      // Falla simulada: borrar una sesion lanza un error dentro de la transaccion del restablecimiento.
      await con().db.execute(sql`
        CREATE FUNCTION prueba_fallar_borrado_sesion() RETURNS trigger AS $$
        BEGIN RAISE EXCEPTION 'fallo simulado'; END; $$ LANGUAGE plpgsql`)
      await con().db.execute(sql`
        CREATE TRIGGER prueba_fallar_borrado BEFORE DELETE ON session
        FOR EACH ROW EXECUTE FUNCTION prueba_fallar_borrado_sesion()`)

      const falla = await restablecer(token, NUEVA)

      expect(falla.status).toBeGreaterThanOrEqual(500)
      expect(falla.cuerpo).not.toMatch(/fallo simulado|trigger|session/i)
      expect(await contrasenaVale(ACTUAL)).toBe(true) // la contrasena no cambio
      expect(await contar("session")).toBe(1) // la sesion sigue
      // El enlace tampoco se gasto: sin la falla, el mismo enlace funciona.
      await con().db.execute(sql`DROP TRIGGER prueba_fallar_borrado ON session`)
      expect((await restablecer(token, NUEVA)).status).toBe(200)
    })
  })

  describe("reemision del enlace (caracterizacion: decision de producto pendiente)", () => {
    it("pedir un segundo enlace NO invalida el anterior: ambos valen hasta usarse o vencer", async () => {
      const primero = await pedirEnlace()
      const segundo = await pedirEnlace()
      expect(segundo).not.toBe(primero)
      expect(await contar("verification")).toBe(2)

      // Usar el primero no toca al segundo.
      expect((await restablecer(primero, NUEVA)).status).toBe(200)
      const aunVale = await restablecer(segundo, OTRA)
      expect(aunVale.status).toBe(200)
      expect(await contrasenaVale(OTRA)).toBe(true)
    })
  })
})
