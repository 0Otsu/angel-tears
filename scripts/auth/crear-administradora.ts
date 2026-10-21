// Alta controlada de la unica Administradora (ADR-004, tarea 2.2). Uso, desde una terminal:
//   pnpm auth:crear-administradora
// Pide email, nombre y contrasena (esta ultima con entrada oculta). Para un entorno sin
// terminal interactiva se pueden pasar por variables de entorno ADMIN_EMAIL, ADMIN_NOMBRE y
// ADMIN_CONTRASENA, definidas solo para ese comando y nunca guardadas en un archivo versionado.
//
// Reglas de seguridad:
//  - NO acepta argumentos de linea de comandos: quedarian en el historial del terminal y en la
//    lista de procesos. Si se pasa alguno, aborta sin leer nada.
//  - Nunca imprime ni registra la contrasena.
//  - Es seguro repetirlo: si ya existe una cuenta no crea otra ni modifica la existente.
//  - Usa DATABASE_URL (de .env.local o del entorno): se ejecuta contra esa base.
import { createInterface } from "node:readline/promises"
import { crearConexionBd, leerUrlBd } from "../../lib/infraestructura/conexion-bd"
import { aprovisionarAdministradora } from "../../lib/modulos/autenticacion/aprovisionar-administradora"

try {
  process.loadEnvFile(".env.local")
} catch {
  // Sin archivo local se usan las variables ya definidas en el entorno.
}

function salir(mensaje: string, codigo: number): never {
  const salida = codigo === 0 ? console.log : console.error
  salida(mensaje)
  process.exit(codigo)
}

async function preguntar(texto: string): Promise<string> {
  const lector = createInterface({ input: process.stdin, output: process.stdout })
  try {
    return (await lector.question(texto)).trim()
  } finally {
    lector.close()
  }
}

// Lee sin mostrar lo que se escribe. Requiere una terminal interactiva.
function preguntarOculto(texto: string): Promise<string> {
  return new Promise((resolver, rechazar) => {
    const entrada = process.stdin
    if (!entrada.isTTY) {
      rechazar(
        new Error("No hay terminal interactiva: defini ADMIN_CONTRASENA solo para este comando."),
      )
      return
    }
    process.stdout.write(texto)
    let valor = ""
    entrada.setRawMode(true)
    entrada.resume()
    entrada.setEncoding("utf8")

    const terminar = () => {
      entrada.setRawMode(false)
      entrada.pause()
      entrada.removeListener("data", alRecibir)
      process.stdout.write("\n")
    }
    const alRecibir = (tecla: string) => {
      for (const caracter of tecla) {
        if (caracter === "\r" || caracter === "\n") {
          terminar()
          resolver(valor)
          return
        }
        if (caracter === "\u0003") {
          terminar()
          rechazar(new Error("Cancelado."))
          return
        }
        if (caracter === "\u007f" || caracter === "\b") {
          valor = valor.slice(0, -1)
        } else {
          valor += caracter
        }
      }
    }
    entrada.on("data", alRecibir)
  })
}

async function leerContrasena(): Promise<string> {
  const definida = process.env.ADMIN_CONTRASENA
  if (definida) return definida
  const primera = await preguntarOculto("Contrasena (minimo 8 caracteres): ")
  const segunda = await preguntarOculto("Repetir contrasena: ")
  if (primera !== segunda) {
    salir("Las contrasenas no coinciden. No se hizo ningun cambio.", 1)
  }
  return primera
}

async function principal(): Promise<void> {
  if (process.argv.length > 2) {
    salir(
      "Este script no acepta argumentos (quedarian en el historial del terminal). " +
        "Ejecutalo sin argumentos: pnpm auth:crear-administradora",
      1,
    )
  }

  // Valida la base antes de pedir nada, para fallar rapido y sin mostrar la URL.
  leerUrlBd()

  const email = process.env.ADMIN_EMAIL ?? (await preguntar("Email de la Administradora: "))
  const nombre =
    process.env.ADMIN_NOMBRE ?? ((await preguntar("Nombre [Administradora]: ")) || "Administradora")
  const contrasena = await leerContrasena()

  const conexion = crearConexionBd(leerUrlBd())
  try {
    const resultado = await aprovisionarAdministradora(conexion, { email, nombre, contrasena })
    switch (resultado.estado) {
      case "creada":
        salir(`Administradora creada: ${resultado.email}. Ya puede iniciar sesion.`, 0)
        break
      case "ya_existe":
        salir(
          "Ya existe una administradora. No se creo ninguna cuenta ni se modifico la existente.",
          0,
        )
        break
      case "datos_invalidos":
        salir(
          "Datos invalidos, no se hizo ningun cambio:\n" +
            resultado.errores.map((e) => ` - ${e.campo}: ${e.mensaje}`).join("\n"),
          1,
        )
    }
  } finally {
    await conexion.pool.end()
  }
}

principal().catch((error: unknown) => {
  // Solo el mensaje: nunca el objeto completo ni la traza, para no exponer datos de la solicitud.
  const mensaje = error instanceof Error ? error.message : "error desconocido"
  salir(`No se pudo crear la cuenta: ${mensaje}`, 1)
})
