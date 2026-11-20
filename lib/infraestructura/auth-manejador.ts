// Envoltorio de seguridad del endpoint de Better Auth (matriz de errores del change de Auth).
// Better Auth administra las cookies y el reset. La respuesta HTTP al navegador se entrega
// sin cache y sin tokens de sesión en JSON, y los fallos internos se redactan.

// Codigos de Node y de PostgreSQL que indican que la base no esta disponible.
const CODIGOS_DE_CONEXION = new Set([
  "ECONNREFUSED",
  "ENOTFOUND",
  "ETIMEDOUT",
  "ECONNRESET",
  "EAI_AGAIN",
  "57P01", // admin_shutdown
  "57P03", // cannot_connect_now
  "08000",
  "08001",
  "08003",
  "08004",
  "08006",
])

type ErrorConCodigo = { code?: unknown; errors?: unknown; cause?: unknown }

// Las librerias envuelven el error original (`cause`) y Node agrega los intentos IPv4/IPv6
// (`errors`): se recorre la cadena, con tope de profundidad, para encontrar el codigo.
function codigosDe(error: unknown, profundidad = 0): string[] {
  if (typeof error !== "object" || error === null || profundidad > 5) return []
  const { code, errors, cause } = error as ErrorConCodigo
  const propios = typeof code === "string" ? [code] : []
  const anidados = Array.isArray(errors) ? errors.flatMap((e) => codigosDe(e, profundidad + 1)) : []
  return [...propios, ...anidados, ...codigosDe(cause, profundidad + 1)]
}

const cabecerasPrivadas = { "cache-control": "no-store", "referrer-policy": "no-referrer" }

function respuestaDeError(sinConexion: boolean): Response {
  const body = sinConexion
    ? { code: "SERVICIO_NO_DISPONIBLE", message: "El servicio no está disponible. Probá de nuevo en unos minutos." }
    : { code: "ERROR_INESPERADO", message: "Ocurrió un error inesperado. Probá de nuevo en unos minutos." }
  return Response.json(body, { status: sinConexion ? 503 : 500, headers: cabecerasPrivadas })
}

async function protegerRespuesta(respuesta: Response): Promise<Response> {
  if (respuesta.status >= 500) return respuestaDeError(respuesta.status === 503)

  const headers = new Headers(respuesta.headers)
  for (const [nombre, valor] of Object.entries(cabecerasPrivadas)) headers.set(nombre, valor)
  const init = { status: respuesta.status, statusText: respuesta.statusText, headers }
  if (!respuesta.ok || !respuesta.body || !headers.get("content-type")?.includes("application/json")) {
    return new Response(respuesta.body, init)
  }

  // Login, cambio de contraseña y consultas de sesión devuelven `token` en distintos niveles.
  // La interfaz usa la cookie HttpOnly; los enlaces de recuperación viajan por correo/Location.
  const cuerpo = JSON.stringify(await respuesta.json(), (clave, valor) => clave === "token" ? undefined : valor)
  headers.delete("content-length")
  return new Response(cuerpo, init)
}

export async function atenderSolicitudAuth(obtenerRespuesta: () => Promise<Response>): Promise<Response> {
  try {
    return await protegerRespuesta(await obtenerRespuesta())
  } catch (error) {
    const codigos = codigosDe(error)
    const sinConexion = codigos.some((codigo) => CODIGOS_DE_CONEXION.has(codigo))
    // Solo el tipo y el codigo, nunca el mensaje ni la traza: pueden incluir datos de la solicitud.
    console.error("[auth] fallo interno al atender la solicitud", {
      tipo: error instanceof Error ? error.name : typeof error,
      codigos,
    })
    return respuestaDeError(sinConexion)
  }
}
