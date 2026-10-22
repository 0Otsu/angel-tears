import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { sql } from "drizzle-orm"
import { createAuthClient } from "better-auth/client"
import { crearAuth } from "@/lib/infraestructura/auth-config"
import type { ConexionBd } from "@/lib/infraestructura/conexion-bd"
import { aprovisionarAdministradora } from "@/lib/modulos/autenticacion/aprovisionar-administradora"
import {
  cambiarContrasena,
  cerrarOtrasSesiones,
  type ClienteCambioContrasena,
} from "@/lib/modulos/autenticacion/cambiar-contrasena"
import { crearExigirAdministradora, esErrorSesionRequerida } from "@/lib/modulos/autenticacion/contrato"
import { crearVerificadorDeSesion } from "@/lib/modulos/autenticacion/verificador-better-auth"
import { crearConexionPruebas } from "@/pruebas/arnes-bd"

// Cambio de contrasena autenticado (tarea 3.5) con el cliente REAL de Better Auth hablando con
// el handler real y PostgreSQL. Politica (DECISIONES_PRODUCTO_MVP, seccion 10): verificar la
// contrasena actual, conservar la sesion desde la que se cambia (sin extender su maximo de 30
// dias) e invalidar todas las demas.

const ORIGEN = "http://localhost:3100"
const EMAIL = "admin@ejemplo.com"
const ACTUAL = "una-contrasena-de-prueba-123"
const NUEVA = "contrasena-nueva-de-prueba-456"
const DIA_MS = 24 * 60 * 60 * 1000

type Sesion = { cookie: string; token: string }

describe("cambio de contrasena autenticado", () => {
  let conexion: ConexionBd | undefined

  function con() {
    if (!conexion) throw new Error("La conexion de pruebas no esta disponible.")
    return conexion
  }

  const auth = () => crearAuth(con().db)
  const exigir = () => crearExigirAdministradora(crearVerificadorDeSesion(auth()))

  async function filas<T>(consulta: ReturnType<typeof sql>): Promise<T[]> {
    return (await con().db.execute(consulta)).rows as T[]
  }

  async function iniciarSesion(): Promise<Sesion> {
    const respuesta = await auth().handler(
      new Request(`${ORIGEN}/api/auth/sign-in/email`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: ORIGEN },
        body: JSON.stringify({ email: EMAIL, password: ACTUAL }),
      }),
    )
    expect(respuesta.status).toBe(200)
    const setCookie = respuesta.headers.getSetCookie().find((c) => c.includes("session_token")) ?? ""
    const cookie = setCookie.split(";")[0]
    const token = decodeURIComponent(cookie.slice(cookie.indexOf("=") + 1)).split(".")[0]
    return { cookie, token }
  }

  // Cliente real de Better Auth cuyas solicitudes van directo al handler, con la cookie dada.
  function crearCliente(opciones: { cookie?: string; ip?: string } = {}) {
    return createAuthClient({
      baseURL: ORIGEN,
      fetchOptions: {
        customFetchImpl: async (entrada, init) => auth().handler(new Request(entrada, init)),
        headers: {
          origin: ORIGEN,
          ...(opciones.cookie ? { cookie: opciones.cookie } : {}),
          ...(opciones.ip ? { "x-forwarded-for": opciones.ip } : {}),
        },
      },
    })
  }

  const clienteDe = (opciones?: { cookie?: string; ip?: string }): ClienteCambioContrasena => {
    const c = crearCliente(opciones)
    return { changePassword: (e) => c.changePassword(e), revokeOtherSessions: () => c.revokeOtherSessions() }
  }

  async function esRechazada(sesion: Sesion): Promise<boolean> {
    try {
      await exigir()(new Headers({ cookie: sesion.cookie }))
      return false
    } catch (error) {
      return esErrorSesionRequerida(error)
    }
  }

  async function hashGuardado(): Promise<string> {
    const [{ password }] = await filas<{ password: string }>(
      sql`SELECT password FROM account WHERE provider_id = 'credential'`,
    )
    return password
  }

  async function contrasenaVale(contrasena: string): Promise<boolean> {
    const ctx = await auth().$context
    return ctx.password.verify({ hash: await hashGuardado(), password: contrasena })
  }

  async function sesionesEnLaBase(): Promise<{ token: string; expires_at: Date }[]> {
    const filasCrudas = await filas<{ token: string; expires_at: string | Date }>(
      sql`SELECT token, expires_at FROM session ORDER BY created_at`,
    )
    // La consulta cruda devuelve la fecha como texto: se convierte para poder compararla.
    return filasCrudas.map((f) => ({ token: f.token, expires_at: new Date(f.expires_at) }))
  }

  const datos = { contrasenaActual: ACTUAL, contrasenaNueva: NUEVA, confirmacion: NUEVA }

  beforeAll(() => {
    vi.stubEnv("BETTER_AUTH_SECRET", "secreto-solo-para-pruebas-0123456789abcdef")
    vi.stubEnv("BETTER_AUTH_URL", ORIGEN)
    conexion = crearConexionPruebas()
  })

  beforeEach(async () => {
    await con().db.execute(sql`DELETE FROM "user"`)
    await con().db.execute(sql`DELETE FROM rate_limit`)
    await aprovisionarAdministradora(con(), { email: EMAIL, nombre: "Sofia", contrasena: ACTUAL })
  })

  afterEach(async () => {
    vi.useRealTimers()
    await conexion?.db.execute(sql`DELETE FROM "user"`)
    await conexion?.db.execute(sql`DELETE FROM rate_limit`)
  })

  afterAll(async () => {
    vi.unstubAllEnvs()
    await conexion?.pool.end()
  })

  it("cambia la contrasena, conserva ESTA sesion sin extender su maximo y cierra las demas", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    const inicio = new Date("2026-11-02T12:00:00.000Z")
    vi.setSystemTime(inicio)
    const actual = await iniciarSesion()
    const celular = await iniciarSesion()
    const computadora = await iniciarSesion()
    const antes = (await sesionesEnLaBase()).find((s) => s.token === actual.token)
    expect(antes?.expires_at.getTime()).toBe(inicio.getTime() + 30 * DIA_MS)

    // Diez dias despues, desde la sesion "actual".
    vi.setSystemTime(inicio.getTime() + 10 * DIA_MS)
    const resultado = await cambiarContrasena(clienteDe({ cookie: actual.cookie }), datos)

    expect(resultado).toEqual({ estado: "ok" })
    // La contrasena nueva vale y la vieja ya no.
    expect(await contrasenaVale(NUEVA)).toBe(true)
    expect(await contrasenaVale(ACTUAL)).toBe(false)
    // Queda UNA sola sesion: la misma (mismo token) y con el MISMO vencimiento que tenia.
    const despues = await sesionesEnLaBase()
    expect(despues).toHaveLength(1)
    expect(despues[0].token).toBe(actual.token)
    expect(despues[0].expires_at.getTime()).toBe(antes?.expires_at.getTime())
    // La cookie original sigue sirviendo; las demas sesiones quedaron cerradas.
    expect(await esRechazada(actual)).toBe(false)
    expect(await esRechazada(celular)).toBe(true)
    expect(await esRechazada(computadora)).toBe(true)
  })

  it("con la contrasena actual incorrecta no cambia nada ni cierra ninguna sesion", async () => {
    const actual = await iniciarSesion()
    const otra = await iniciarSesion()
    const hashAntes = await hashGuardado()

    const resultado = await cambiarContrasena(clienteDe({ cookie: actual.cookie }), {
      ...datos,
      contrasenaActual: "contrasena-equivocada-999",
    })

    expect(resultado).toEqual({ estado: "contrasena_actual_incorrecta" })
    expect(await hashGuardado()).toBe(hashAntes)
    expect(await esRechazada(actual)).toBe(false)
    expect(await esRechazada(otra)).toBe(false)
  })

  it("sin sesion o con sesion vencida no cambia nada", async () => {
    const hashAntes = await hashGuardado()
    const sinCookie = await cambiarContrasena(clienteDe(), datos)

    const sesion = await iniciarSesion()
    await con().db.execute(sql`UPDATE session SET expires_at = now() - interval '1 minute'`)
    const vencida = await cambiarContrasena(clienteDe({ cookie: sesion.cookie }), datos)

    expect(sinCookie).toEqual({ estado: "sesion_vencida" })
    expect(vencida).toEqual({ estado: "sesion_vencida" })
    expect(await hashGuardado()).toBe(hashAntes)
  })

  it("el servidor tambien rechaza una contrasena nueva demasiado corta o larga", async () => {
    const sesion = await iniciarSesion()
    const cliente = crearCliente({ cookie: sesion.cookie })
    const hashAntes = await hashGuardado()

    const corta = await cliente.changePassword({ currentPassword: ACTUAL, newPassword: "corta" })
    const larga = await cliente.changePassword({ currentPassword: ACTUAL, newPassword: "a".repeat(129) })

    expect(corta.error?.status).toBe(400)
    expect(larga.error?.status).toBe(400)
    expect(await hashGuardado()).toBe(hashAntes)
  })

  it("limita los intentos de adivinar la contrasena actual y el limite es temporal", async () => {
    const sesion = await iniciarSesion()
    const cliente = clienteDe({ cookie: sesion.cookie, ip: "203.0.113.50" })
    const equivocada = { ...datos, contrasenaActual: "contrasena-equivocada-999" }
    const hashAntes = await hashGuardado()

    const estados: string[] = []
    for (let i = 0; i < 5; i++) estados.push((await cambiarContrasena(cliente, equivocada)).estado)

    expect(estados.slice(0, 3)).toEqual(Array(3).fill("contrasena_actual_incorrecta"))
    expect(estados.slice(3)).toEqual(Array(2).fill("demasiados_intentos"))
    expect(await hashGuardado()).toBe(hashAntes)

    // Al vencer la ventana vuelve a permitir intentos (aca, el correcto).
    await con().db.execute(sql`UPDATE rate_limit SET last_request = last_request - 600000`)
    expect(await cambiarContrasena(cliente, datos)).toEqual({ estado: "ok" })
  })

  it("si falla el cierre de las otras sesiones lo informa y el reintento las cierra sin tocar la contrasena", async () => {
    const actual = await iniciarSesion()
    const otra = await iniciarSesion()
    const real = clienteDe({ cookie: actual.cookie })
    const sinCierre: ClienteCambioContrasena = {
      changePassword: real.changePassword,
      revokeOtherSessions: async () => ({ error: { status: 500 } }),
    }

    const resultado = await cambiarContrasena(sinCierre, datos)

    // La contrasena ya cambio, pero la otra sesion sigue abierta: eso es lo que se informa.
    expect(resultado).toEqual({ estado: "cambiada_sin_cerrar_otras" })
    expect(await contrasenaVale(NUEVA)).toBe(true)
    expect(await esRechazada(otra)).toBe(false)

    expect(await cerrarOtrasSesiones(real)).toEqual({ estado: "ok" })
    expect(await esRechazada(otra)).toBe(true)
    expect(await esRechazada(actual)).toBe(false)
    expect(await contrasenaVale(NUEVA)).toBe(true)
  })

  it("cerrar las otras sesiones cuando no hay otras es inofensivo", async () => {
    const sesion = await iniciarSesion()

    expect(await cerrarOtrasSesiones(clienteDe({ cookie: sesion.cookie }))).toEqual({ estado: "ok" })
    expect(await esRechazada(sesion)).toBe(false)
  })

  // Evidencia de por que la implementacion NO usa `changePassword({ revokeOtherSessions: true })`.
  // Si una version futura de Better Auth cambia este comportamiento, esta prueba lo avisa.
  it("caracterizacion: la opcion revokeOtherSessions de Better Auth REEMPLAZA la sesion actual y reinicia sus 30 dias", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    const inicio = new Date("2026-11-02T12:00:00.000Z")
    vi.setSystemTime(inicio)
    const actual = await iniciarSesion()
    vi.setSystemTime(inicio.getTime() + 10 * DIA_MS)

    const respuesta = await crearCliente({ cookie: actual.cookie }).changePassword({
      currentPassword: ACTUAL,
      newPassword: NUEVA,
      revokeOtherSessions: true,
    })

    expect(respuesta.error).toBeNull()
    const despues = await sesionesEnLaBase()
    expect(despues).toHaveLength(1)
    // Token distinto: la sesion actual fue reemplazada y la cookie vieja ya no sirve...
    expect(despues[0].token).not.toBe(actual.token)
    expect(await esRechazada(actual)).toBe(true)
    // ...y el vencimiento se corrio 10 dias (nuevos 30 dias desde el cambio): contradice la politica.
    expect(despues[0].expires_at.getTime()).toBe(inicio.getTime() + 40 * DIA_MS)
  })
})
