import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { configuracionNegocio } from "@/lib/infraestructura/esquemas/configuracion-negocio"
import { crearAuth } from "@/lib/infraestructura/auth-config"
import { user } from "@/lib/infraestructura/esquemas/auth"
import { eq } from "drizzle-orm"
import { crearExigirAdministradora } from "@/lib/modulos/autenticacion/contrato"
import { crearVerificadorDeSesion } from "@/lib/modulos/autenticacion/verificador-better-auth"
import { datosLocal, serializarDatosEstructurados } from "@/lib/modulos/catalogo/datos-estructurados"
import { proyectarNegocioPublico } from "@/lib/negocio-publico"
import { crearConexionPruebas } from "@/pruebas/arnes-bd"
import { configuracionPrueba } from "@/pruebas/fixtures/configuracion-negocio"
import type { ConexionBd } from "@/lib/infraestructura/conexion-bd"
import { editarConfiguracionNegocio } from "./administracion"
import type { ConfiguracionNegocio } from "./contrato"
import { guardarConfiguracionNegocio, leerConfiguracionNegocio } from "./persistencia"

describe("Configuración del negocio en PostgreSQL", () => {
  let conexion: ConexionBd
  let inicial: ConfiguracionNegocio
  const email = "configuracion@ejemplo.test"

  beforeAll(async () => {
    conexion = crearConexionPruebas()
    inicial = await leerConfiguracionNegocio(conexion.db)
  })
  afterAll(async () => {
    if (!conexion) return
    try {
      if (inicial) await guardarConfiguracionNegocio(conexion.db, inicial)
      await conexion.db.delete(user).where(eq(user.email, email))
    } finally {
      await conexion.pool.end()
    }
  })

  it("la migración deja una sola configuración con los datos iniciales", async () => {
    expect(await conexion.db.select().from(configuracionNegocio)).toHaveLength(1)
    expect(inicial).toMatchObject({
      direccion: "Entre Ríos 924", localidad: "Concordia",
      diasAtencion: ["lunes", "martes", "miercoles", "jueves", "viernes"],
      apertura: "17:00", cierre: "21:00", telefonoWhatsApp: "5493454266760",
    })
    await expect(conexion.db.insert(configuracionNegocio).values({ ...inicial, id: 2 })).rejects.toThrow()
    expect(await leerConfiguracionNegocio(conexion.db)).toEqual(inicial)
  })

  it("el guard real rechaza una edición sin cookie sin escribir datos", async () => {
    const auth = crearAuth(conexion.db)
    const exigir = crearExigirAdministradora(crearVerificadorDeSesion(auth))
    expect(await editarConfiguracionNegocio(conexion.db, exigir, new Headers(), configuracionPrueba))
      .toEqual({ estado: "sesion_requerida" })
    expect(await leerConfiguracionNegocio(conexion.db)).toEqual(inicial)
  })

  it("edita con una sesión Better Auth, publica el DTO actual y no aplica cambios inválidos", async () => {
    const origen = process.env.BETTER_AUTH_URL!
    const password = "contrasena-de-prueba-configuracion"
    const alta = crearAuth(conexion.db, { permitirRegistro: true })
    await alta.api.signUpEmail({ body: { email, name: "Administradora de prueba", password } })
    const auth = crearAuth(conexion.db)
    const login = await auth.handler(new Request(`${origen}/api/auth/sign-in/email`, {
      method: "POST", headers: { origin: origen, "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    }))
    expect(login.status).toBe(200)
    const cookie = login.headers.getSetCookie().find(c => c.includes("session_token"))!.split(";")[0]
    const encabezados = new Headers({ cookie })
    const exigir = crearExigirAdministradora(crearVerificadorDeSesion(auth))
    const guardado = await editarConfiguracionNegocio(conexion.db, exigir, encabezados, configuracionPrueba)
    expect(guardado).toEqual({ estado: "ok", configuracion: configuracionPrueba })

    const resultado = await editarConfiguracionNegocio(conexion.db, exigir, encabezados, { ...configuracionPrueba, direccion: "No guardar", cierre: "01:00" })
    expect(resultado).toMatchObject({ estado: "datos_invalidos", errores: { cierre: expect.any(Array) } })
    const persistida = await leerConfiguracionNegocio(conexion.db)
    expect(persistida).toEqual(configuracionPrueba)
    expect(await conexion.db.select().from(configuracionNegocio)).toHaveLength(1)

    const publico = proyectarNegocioPublico(persistida)
    expect(publico).toMatchObject({ whatsapp: "https://wa.me/5491100000000", instagram: "https://www.instagram.com/accesorios.prueba/" })
    expect(publico).not.toHaveProperty("id")
    expect(JSON.parse(serializarDatosEstructurados(datosLocal(publico, null)))).toMatchObject({
      address: { streetAddress: "Calle de prueba 123, Local 2" },
      telephone: "+5491100000000",
      sameAs: [publico.instagram],
      openingHoursSpecification: { opens: "09:30:00", closes: "12:15:00", dayOfWeek: ["https://schema.org/Monday", "https://schema.org/Saturday"] },
    })
  })
})
