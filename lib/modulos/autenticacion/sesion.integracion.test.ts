import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { sql } from "drizzle-orm"
import { DURACION_MAXIMA_SESION_SEGUNDOS, crearAuth } from "@/lib/infraestructura/auth-config"
import type { ConexionBd } from "@/lib/infraestructura/conexion-bd"
import { aprovisionarAdministradora } from "@/lib/modulos/autenticacion/aprovisionar-administradora"
import {
  conAdministradora,
  crearExigirAdministradora,
  esErrorSesionRequerida,
} from "@/lib/modulos/autenticacion/contrato"
import { crearVerificadorDeSesion } from "@/lib/modulos/autenticacion/verificador-better-auth"
import { crearConexionPruebas } from "@/pruebas/arnes-bd"

// Sesiones reales de Better Auth contra PostgreSQL (tareas 2.4 y 2.5): proteccion en el
// servidor, vencimiento, politica de 30 dias absolutos y cierre de sesion efectivo.

const ORIGEN = "http://localhost:3100"
const EMAIL = "admin@ejemplo.com"
const CONTRASENA = "una-contrasena-de-prueba-123"
const DIA_MS = 24 * 60 * 60 * 1000

type Sesion = { cookie: string; setCookie: string }

describe("sesion de la Administradora", () => {
  let conexion: ConexionBd | undefined

  function con() {
    if (!conexion) throw new Error("La conexion de pruebas no esta disponible.")
    return conexion
  }

  const auth = () => crearAuth(con().db)
  const exigir = () => crearExigirAdministradora(crearVerificadorDeSesion(auth()))
  const encabezadosCon = (cookie: string) => new Headers({ cookie })

  async function filas<T>(consulta: ReturnType<typeof sql>): Promise<T[]> {
    return (await con().db.execute(consulta)).rows as T[]
  }

  async function iniciarSesion(): Promise<Sesion> {
    const respuesta = await auth().handler(
      new Request(`${ORIGEN}/api/auth/sign-in/email`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: ORIGEN },
        body: JSON.stringify({ email: EMAIL, password: CONTRASENA }),
      }),
    )
    expect(respuesta.status).toBe(200)
    const setCookie = respuesta.headers.getSetCookie().find((c) => c.includes("session_token")) ?? ""
    expect(setCookie).not.toBe("")
    return { cookie: setCookie.split(";")[0], setCookie }
  }

  async function cerrarSesion(sesion: Sesion): Promise<Response> {
    return auth().handler(
      new Request(`${ORIGEN}/api/auth/sign-out`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: ORIGEN, cookie: sesion.cookie },
        body: "{}",
      }),
    )
  }

  async function esRechazada(encabezados: Headers): Promise<boolean> {
    try {
      await exigir()(encabezados)
      return false
    } catch (error) {
      return esErrorSesionRequerida(error)
    }
  }

  async function vencimiento(): Promise<Date> {
    const [{ expires_at }] = await filas<{ expires_at: Date }>(sql`SELECT expires_at FROM session LIMIT 1`)
    return new Date(expires_at)
  }

  beforeAll(() => {
    vi.stubEnv("BETTER_AUTH_SECRET", "secreto-solo-para-pruebas-0123456789abcdef")
    vi.stubEnv("BETTER_AUTH_URL", ORIGEN)
    conexion = crearConexionPruebas()
  })

  beforeEach(async () => {
    await con().db.execute(sql`DELETE FROM "user"`)
    await con().db.execute(sql`DELETE FROM rate_limit`)
    await aprovisionarAdministradora(con(), { email: EMAIL, nombre: "Sofia", contrasena: CONTRASENA })
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

  describe("proteccion en el servidor (2.4)", () => {
    it("con una sesion valida devuelve la identidad de la Administradora, sin datos de sesion", async () => {
      const sesion = await iniciarSesion()

      const identidad = await exigir()(encabezadosCon(sesion.cookie))

      expect(Object.keys(identidad).sort()).toEqual(["email", "id", "nombre"])
      expect(identidad.email).toBe(EMAIL)
      expect(identidad.nombre).toBe("Sofia")
      expect(JSON.stringify(identidad)).not.toContain(sesion.cookie.split("=")[1])
    })

    it("rechaza las solicitudes sin sesion, con cookie basura o con la firma alterada", async () => {
      const sesion = await iniciarSesion()
      const [nombre, valor] = [sesion.cookie.split("=")[0], sesion.cookie.slice(sesion.cookie.indexOf("=") + 1)]
      const alterada = valor.slice(0, -4) + (valor.endsWith("AAAA") ? "BBBB" : "AAAA")

      expect(await esRechazada(new Headers())).toBe(true)
      expect(await esRechazada(encabezadosCon(`${nombre}=cualquier-cosa`))).toBe(true)
      expect(await esRechazada(encabezadosCon(`${nombre}=${alterada}`))).toBe(true)
      expect(await esRechazada(encabezadosCon("otra-cookie=valor"))).toBe(true)
      // La original sigue valiendo: nada de lo anterior la afecto.
      expect(await esRechazada(encabezadosCon(sesion.cookie))).toBe(false)
    })

    it("rechaza una sesion vencida", async () => {
      const sesion = await iniciarSesion()
      await con().db.execute(sql`UPDATE session SET expires_at = now() - interval '1 minute'`)

      expect(await esRechazada(encabezadosCon(sesion.cookie))).toBe(true)
    })

    it("rechaza una sesion revocada en la base", async () => {
      const sesion = await iniciarSesion()
      await con().db.execute(sql`DELETE FROM session`)

      expect(await esRechazada(encabezadosCon(sesion.cookie))).toBe(true)
    })

    it("una mutacion sin sesion no se ejecuta", async () => {
      const efecto = vi.fn()

      const resultado = await conAdministradora(exigir(), new Headers(), async () => efecto())

      expect(resultado).toEqual({ estado: "sesion_requerida" })
      expect(efecto).not.toHaveBeenCalled()
    })

    it("una mutacion con sesion se ejecuta una sola vez, con la identidad", async () => {
      const sesion = await iniciarSesion()
      const efecto = vi.fn()

      const resultado = await conAdministradora(exigir(), encabezadosCon(sesion.cookie), async (a) => efecto(a.email))

      expect(resultado.estado).toBe("ok")
      expect(efecto).toHaveBeenCalledTimes(1)
      expect(efecto).toHaveBeenCalledWith(EMAIL)
    })

    it("si la sesion vence antes de enviar, no hay efectos ni duplicados y no se reenvia sola", async () => {
      const sesion = await iniciarSesion()
      const efecto = vi.fn()
      await conAdministradora(exigir(), encabezadosCon(sesion.cookie), async () => efecto())
      await con().db.execute(sql`UPDATE session SET expires_at = now() - interval '1 minute'`)

      const alEnviar = await conAdministradora(exigir(), encabezadosCon(sesion.cookie), async () => efecto())
      const reintento = await conAdministradora(exigir(), encabezadosCon(sesion.cookie), async () => efecto())

      expect(alEnviar).toEqual({ estado: "sesion_requerida" })
      expect(reintento).toEqual({ estado: "sesion_requerida" })
      expect(efecto).toHaveBeenCalledTimes(1) // solo el envio anterior al vencimiento
    })

    it("con la base de datos caida no concede el acceso y propaga la falla", async () => {
      const sesion = await iniciarSesion()
      const caida = (await import("@/lib/infraestructura/conexion-bd")).crearConexionBd(
        "postgresql://angel_tears:marcador@localhost:1/angel_tears_test",
      )
      try {
        const exigirSinBase = crearExigirAdministradora(crearVerificadorDeSesion(crearAuth(caida.db)))

        await expect(exigirSinBase(encabezadosCon(sesion.cookie))).rejects.toThrow()
      } finally {
        await caida.pool.end()
      }
    }, 20_000)
  })

  describe("persistencia y vencimiento de 30 dias absolutos (2.5)", () => {
    it("la cookie y la sesion duran 30 dias desde el login", async () => {
      vi.useFakeTimers({ toFake: ["Date"] })
      const inicio = new Date("2026-11-02T12:00:00.000Z")
      vi.setSystemTime(inicio)

      const sesion = await iniciarSesion()

      expect(DURACION_MAXIMA_SESION_SEGUNDOS).toBe(30 * 24 * 60 * 60)
      expect(sesion.setCookie).toMatch(new RegExp(`Max-Age=${DURACION_MAXIMA_SESION_SEGUNDOS}\\b`))
      expect(sesion.setCookie).toContain("HttpOnly")
      expect(sesion.setCookie).toMatch(/SameSite=Lax/i)
      expect((await vencimiento()).getTime()).toBe(inicio.getTime() + 30 * DIA_MS)
    })

    it("el uso diario no extiende el maximo: vale 29 dias y al dia 30 exige un nuevo login", async () => {
      vi.useFakeTimers({ toFake: ["Date"] })
      const inicio = new Date("2026-11-02T12:00:00.000Z")
      vi.setSystemTime(inicio)
      const sesion = await iniciarSesion()
      const vencimientoOriginal = (await vencimiento()).getTime()

      for (let dia = 1; dia <= 29; dia++) {
        vi.setSystemTime(inicio.getTime() + dia * DIA_MS)
        // Se usa la sesion todos los dias: ni la identidad ni el vencimiento cambian.
        expect(await esRechazada(encabezadosCon(sesion.cookie)), `dia ${dia}`).toBe(false)
        expect((await vencimiento()).getTime(), `vencimiento el dia ${dia}`).toBe(vencimientoOriginal)
      }

      // Justo antes del limite todavia vale; recien pasado el limite se rechaza.
      vi.setSystemTime(inicio.getTime() + 30 * DIA_MS - 1000)
      expect(await esRechazada(encabezadosCon(sesion.cookie))).toBe(false)
      vi.setSystemTime(inicio.getTime() + 30 * DIA_MS + 1000)
      expect(await esRechazada(encabezadosCon(sesion.cookie))).toBe(true)
    })

    it("al reabrir el navegador con la misma cookie la sesion sigue vigente", async () => {
      const sesion = await iniciarSesion()

      // "Reabrir" = una solicitud nueva y sin estado que solo trae la cookie guardada.
      for (let i = 0; i < 3; i++) {
        expect(await esRechazada(encabezadosCon(sesion.cookie))).toBe(false)
      }
    })

    it("tras vencer, un login nuevo abre otra sesion con un nuevo maximo de 30 dias", async () => {
      vi.useFakeTimers({ toFake: ["Date"] })
      const inicio = new Date("2026-11-02T12:00:00.000Z")
      vi.setSystemTime(inicio)
      const primera = await iniciarSesion()
      vi.setSystemTime(inicio.getTime() + 31 * DIA_MS)
      expect(await esRechazada(encabezadosCon(primera.cookie))).toBe(true)

      const segunda = await iniciarSesion()

      expect(await esRechazada(encabezadosCon(segunda.cookie))).toBe(false)
      const [{ total }] = await filas<{ total: number }>(
        sql`SELECT count(*)::int AS total FROM session WHERE expires_at > ${new Date(inicio.getTime() + 31 * DIA_MS)}`,
      )
      expect(total).toBe(1)
    })
  })

  describe("cierre de sesion (2.5)", () => {
    it("invalida la sesion en el servidor y limpia la cookie", async () => {
      const sesion = await iniciarSesion()

      const respuesta = await cerrarSesion(sesion)

      expect(respuesta.status).toBe(200)
      const limpieza = respuesta.headers.getSetCookie().find((c) => c.includes("session_token")) ?? ""
      expect(limpieza).toMatch(/Max-Age=0/i)
      const [{ total }] = await filas<{ total: number }>(sql`SELECT count(*)::int AS total FROM session`)
      expect(total).toBe(0)
      // Volver con la cookie vieja ya no autoriza nada.
      expect(await esRechazada(encabezadosCon(sesion.cookie))).toBe(true)
    })

    it("cerrar una sesion no cierra las demas", async () => {
      const celular = await iniciarSesion()
      const computadora = await iniciarSesion()

      await cerrarSesion(celular)

      expect(await esRechazada(encabezadosCon(celular.cookie))).toBe(true)
      expect(await esRechazada(encabezadosCon(computadora.cookie))).toBe(false)
    })

    it("cerrar sesion sin estar autenticada no produce errores ni sesiones", async () => {
      const respuesta = await cerrarSesion({ cookie: "better-auth.session_token=basura", setCookie: "" })

      expect(respuesta.status).toBeLessThan(500)
      const [{ total }] = await filas<{ total: number }>(sql`SELECT count(*)::int AS total FROM session`)
      expect(total).toBe(0)
    })
  })
})
