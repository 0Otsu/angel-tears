import { describe, expect, it, vi } from "vitest"
import {
  CODIGO_SESION_REQUERIDA,
  ErrorSesionRequerida,
  conAdministradora,
  crearExigirAdministradora,
  esErrorSesionRequerida,
  type ExigirAdministradora,
  type IdentidadAdministradora,
} from "@/lib/modulos/autenticacion/contrato"

const identidad: IdentidadAdministradora = {
  id: "admin-1",
  nombre: "Administradora",
  email: "admin@ejemplo.com",
}

async function capturarError(promesa: Promise<unknown>): Promise<unknown> {
  try {
    await promesa
  } catch (error) {
    return error
  }
  throw new Error("Se esperaba que la promesa fuera rechazada")
}

describe("exigirAdministradora", () => {
  it("devuelve la identidad cuando hay una sesion valida", async () => {
    const exigir = crearExigirAdministradora(async () => identidad)

    await expect(exigir(new Headers())).resolves.toEqual(identidad)
  })

  it("lanza ErrorSesionRequerida cuando no hay sesion", async () => {
    const exigir = crearExigirAdministradora(async () => null)

    const error = await capturarError(exigir(new Headers()))

    expect(esErrorSesionRequerida(error)).toBe(true)
    expect((error as ErrorSesionRequerida).codigo).toBe(CODIGO_SESION_REQUERIDA)
  })

  it("trata una identidad sin id como falta de sesion", async () => {
    const exigir = crearExigirAdministradora(async () => ({ ...identidad, id: "" }))

    expect(esErrorSesionRequerida(await capturarError(exigir(new Headers())))).toBe(true)
  })

  it("entrega solo id, nombre y email aunque el verificador devuelva mas datos", async () => {
    const conDatosSensibles = {
      ...identidad,
      passwordHash: "hash-secreto",
      token: "token-de-sesion",
      expiraEn: new Date(),
    }
    const exigir = crearExigirAdministradora(async () => conDatosSensibles)

    const resultado = await exigir(new Headers())

    expect(Object.keys(resultado).sort()).toEqual(["email", "id", "nombre"])
    expect(JSON.stringify(resultado)).not.toContain("hash-secreto")
    expect(JSON.stringify(resultado)).not.toContain("token-de-sesion")
  })

  it("pasa al verificador los encabezados de la solicitud", async () => {
    const verificar = vi.fn(async () => identidad)
    const exigir = crearExigirAdministradora(verificar)
    const encabezados = new Headers({ cookie: "sesion=abc" })

    await exigir(encabezados)

    expect(verificar).toHaveBeenCalledWith(encabezados)
  })

  it("propaga las fallas tecnicas del verificador y nunca concede acceso", async () => {
    const exigir = crearExigirAdministradora(async () => {
      throw new Error("base de datos no disponible")
    })

    const error = await capturarError(exigir(new Headers()))

    expect(esErrorSesionRequerida(error)).toBe(false)
    expect((error as Error).message).toBe("base de datos no disponible")
  })

  it("el mensaje del error es fijo y no incluye datos de la solicitud", async () => {
    const exigir = crearExigirAdministradora(async () => null)

    const error = (await capturarError(
      exigir(new Headers({ cookie: "sesion=valor-secreto" })),
    )) as Error

    expect(error.message).not.toContain("valor-secreto")
    expect(error.name).toBe("ErrorSesionRequerida")
  })
})

describe("conAdministradora (comandos privados)", () => {
  it("no ejecuta el comando sin sesion y avisa que hace falta iniciar sesion", async () => {
    const comando = vi.fn(async () => "hecho")
    const exigir = crearExigirAdministradora(async () => null)

    const resultado = await conAdministradora(exigir, new Headers(), comando)

    expect(resultado).toEqual({ estado: "sesion_requerida" })
    expect(comando).not.toHaveBeenCalled()
  })

  it("ejecuta el comando una sola vez, con la identidad, cuando hay sesion", async () => {
    const comando = vi.fn(async (a: IdentidadAdministradora) => `por ${a.id}`)
    const exigir = crearExigirAdministradora(async () => identidad)

    const resultado = await conAdministradora(exigir, new Headers(), comando)

    expect(resultado).toEqual({ estado: "ok", valor: "por admin-1" })
    expect(comando).toHaveBeenCalledTimes(1)
  })

  it("si la sesion deja de valer entre dos envios, el segundo no se ejecuta ni se reenvia solo", async () => {
    let vigente = true
    const comando = vi.fn(async () => "hecho")
    const exigir = crearExigirAdministradora(async () => (vigente ? identidad : null))

    await conAdministradora(exigir, new Headers(), comando)
    vigente = false // la sesion vence antes del segundo envio
    const segundo = await conAdministradora(exigir, new Headers(), comando)

    expect(segundo).toEqual({ estado: "sesion_requerida" })
    expect(comando).toHaveBeenCalledTimes(1)
  })

  it("propaga las fallas tecnicas del verificador sin ejecutar el comando", async () => {
    const comando = vi.fn(async () => "hecho")
    const exigir = crearExigirAdministradora(async () => {
      throw new Error("base de datos no disponible")
    })

    await expect(conAdministradora(exigir, new Headers(), comando)).rejects.toThrow(
      "base de datos no disponible",
    )
    expect(comando).not.toHaveBeenCalled()
  })

  it("las fallas del propio comando no se confunden con falta de sesion", async () => {
    const exigir = crearExigirAdministradora(async () => identidad)

    await expect(
      conAdministradora(exigir, new Headers(), async () => {
        throw new Error("fallo del comando")
      }),
    ).rejects.toThrow("fallo del comando")
  })
})

// Consumidor de prueba: muestra como un modulo de negocio usa el contrato sin duplicar su
// logica. `registrarAlgo` es un comando ficticio; los modulos reales reciben `exigir` por
// inyeccion y lo llaman antes de cualquier efecto.
describe("consumidor de prueba del contrato", () => {
  async function registrarAlgo(
    exigir: ExigirAdministradora,
    encabezados: Headers,
    efecto: (actorId: string) => void,
  ): Promise<void> {
    const administradora = await exigir(encabezados)
    efecto(administradora.id)
  }

  it("no ejecuta ningun efecto sin sesion", async () => {
    const efecto = vi.fn()
    const exigir = crearExigirAdministradora(async () => null)

    await expect(registrarAlgo(exigir, new Headers(), efecto)).rejects.toBeInstanceOf(
      ErrorSesionRequerida,
    )
    expect(efecto).not.toHaveBeenCalled()
  })

  it("ejecuta el efecto una vez, con el id de la administradora, cuando hay sesion", async () => {
    const efecto = vi.fn()
    const exigir = crearExigirAdministradora(async () => identidad)

    await registrarAlgo(exigir, new Headers(), efecto)

    expect(efecto).toHaveBeenCalledTimes(1)
    expect(efecto).toHaveBeenCalledWith("admin-1")
  })
})
