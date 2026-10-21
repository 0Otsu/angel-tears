import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { sql } from "drizzle-orm"
import { crearAuth } from "@/lib/infraestructura/auth-config"
import type { ConexionBd } from "@/lib/infraestructura/conexion-bd"
import { aprovisionarAdministradora } from "@/lib/modulos/autenticacion/aprovisionar-administradora"
import { crearConexionPruebas } from "@/pruebas/arnes-bd"

// Alta controlada de la Administradora contra PostgreSQL real (tarea 2.2). La base de pruebas
// es exclusiva de las pruebas (guard del arnes) y estos tests necesitan que `user` este vacia,
// por eso el proyecto "integracion" corre sus archivos en serie.

const CONTRASENA = "una-contrasena-de-prueba-123"
const OTRA_CONTRASENA = "otra-contrasena-distinta-456"

describe("alta controlada de la Administradora", () => {
  let conexion: ConexionBd | undefined

  function con() {
    if (!conexion) throw new Error("La conexion de pruebas no esta disponible.")
    return conexion
  }

  async function filas<T>(consulta: ReturnType<typeof sql>): Promise<T[]> {
    return (await con().db.execute(consulta)).rows as T[]
  }

  async function contar(tabla: "user" | "account" | "session"): Promise<number> {
    const [{ total }] = await filas<{ total: number }>(
      sql`SELECT count(*)::int AS total FROM ${sql.identifier(tabla)}`,
    )
    return total
  }

  async function hashGuardado(): Promise<string | null> {
    const [cuenta] = await filas<{ password: string | null }>(
      sql`SELECT password FROM account WHERE provider_id = 'credential' LIMIT 1`,
    )
    return cuenta?.password ?? null
  }

  beforeAll(() => {
    vi.stubEnv("BETTER_AUTH_SECRET", "secreto-solo-para-pruebas-0123456789abcdef")
    vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3100")
    conexion = crearConexionPruebas()
  })

  // La base de pruebas no tiene datos reales: cada prueba parte sin usuarios.
  beforeEach(async () => {
    await conexion?.db.execute(sql`DELETE FROM "user"`)
  })

  afterEach(async () => {
    await conexion?.db.execute(sql`DELETE FROM "user"`)
  })

  afterAll(async () => {
    vi.unstubAllEnvs()
    await conexion?.pool.end()
  })

  it("crea la primera cuenta con la contrasena guardada como hash", async () => {
    const resultado = await aprovisionarAdministradora(con(), {
      email: "Admin@Ejemplo.com",
      nombre: "Sofia",
      contrasena: CONTRASENA,
    })

    expect(resultado).toEqual({ estado: "creada", email: "admin@ejemplo.com" })
    expect(await contar("user")).toBe(1)
    expect(await contar("account")).toBe(1)
    const hash = await hashGuardado()
    expect(hash).toBeTruthy()
    expect(hash).not.toContain(CONTRASENA)
    // La contrasena creada sirve para iniciar sesion (verificada con el mismo mecanismo de Better Auth).
    const ctx = await crearAuth(con().db).$context
    expect(await ctx.password.verify({ hash: hash as string, password: CONTRASENA })).toBe(true)
    expect(await ctx.password.verify({ hash: hash as string, password: OTRA_CONTRASENA })).toBe(false)
  })

  it("no inicia ninguna sesion al crear la cuenta", async () => {
    await aprovisionarAdministradora(con(), {
      email: "admin@ejemplo.com",
      nombre: "Sofia",
      contrasena: CONTRASENA,
    })

    expect(await contar("session")).toBe(0)
  })

  it("repetir el alta con los mismos datos no cambia nada", async () => {
    const datos = { email: "admin@ejemplo.com", nombre: "Sofia", contrasena: CONTRASENA }
    await aprovisionarAdministradora(con(), datos)
    const hashAntes = await hashGuardado()

    const segundo = await aprovisionarAdministradora(con(), datos)

    expect(segundo).toEqual({ estado: "ya_existe" })
    expect(await contar("user")).toBe(1)
    expect(await hashGuardado()).toBe(hashAntes)
  })

  it("rechaza una segunda cuenta y no altera las credenciales de la existente", async () => {
    await aprovisionarAdministradora(con(), {
      email: "admin@ejemplo.com",
      nombre: "Sofia",
      contrasena: CONTRASENA,
    })
    const hashAntes = await hashGuardado()

    // Otro email, otra contrasena; e incluso el mismo email con otra contrasena.
    const otraCuenta = await aprovisionarAdministradora(con(), {
      email: "intrusa@ejemplo.com",
      nombre: "Intrusa",
      contrasena: OTRA_CONTRASENA,
    })
    const mismoEmail = await aprovisionarAdministradora(con(), {
      email: "admin@ejemplo.com",
      nombre: "Sofia",
      contrasena: OTRA_CONTRASENA,
    })

    expect(otraCuenta).toEqual({ estado: "ya_existe" })
    expect(mismoEmail).toEqual({ estado: "ya_existe" })
    expect(await contar("user")).toBe(1)
    expect(await contar("account")).toBe(1)
    expect(await hashGuardado()).toBe(hashAntes)
    const [usuario] = await filas<{ email: string }>(sql`SELECT email FROM "user"`)
    expect(usuario.email).toBe("admin@ejemplo.com")
  })

  it("con ejecuciones simultaneas crea exactamente una cuenta", async () => {
    const resultados = await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        aprovisionarAdministradora(con(), {
          email: `admin${i}@ejemplo.com`,
          nombre: `Administradora ${i}`,
          contrasena: CONTRASENA,
        }),
      ),
    )

    const estados = resultados.map((r) => r.estado)
    expect(estados.filter((e) => e === "creada")).toHaveLength(1)
    expect(estados.filter((e) => e === "ya_existe")).toHaveLength(5)
    expect(await contar("user")).toBe(1)
    expect(await contar("account")).toBe(1)
  })

  it("rechaza datos invalidos sin crear nada ni repetir la contrasena en el mensaje", async () => {
    const resultado = await aprovisionarAdministradora(con(), {
      email: "esto-no-es-un-email",
      nombre: "   ",
      contrasena: "corta",
    })

    expect(resultado.estado).toBe("datos_invalidos")
    if (resultado.estado !== "datos_invalidos") return
    expect(resultado.errores.map((e) => e.campo).sort()).toEqual(["contrasena", "email", "nombre"])
    expect(JSON.stringify(resultado)).not.toContain("corta")
    expect(await contar("user")).toBe(0)
  })

  it("con una cuenta existente, los datos invalidos se informan y no cambian nada", async () => {
    await aprovisionarAdministradora(con(), {
      email: "admin@ejemplo.com",
      nombre: "Sofia",
      contrasena: CONTRASENA,
    })

    const resultado = await aprovisionarAdministradora(con(), {
      email: "otra@ejemplo.com",
      nombre: "Otra",
      contrasena: "corta",
    })

    expect(resultado.estado).toBe("datos_invalidos")
    expect(await contar("user")).toBe(1)
  })

  it("la instancia normal de la aplicacion sigue sin permitir registrarse", async () => {
    await expect(
      crearAuth(con().db).api.signUpEmail({
        body: { email: "web@ejemplo.com", password: CONTRASENA, name: "Web" },
      }),
    ).rejects.toThrow()

    expect(await contar("user")).toBe(0)
  })
})
