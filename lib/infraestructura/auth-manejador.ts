// Envoltorio de seguridad del endpoint de Better Auth (matriz de errores del change de Auth).
// Si la solicitud falla por un problema interno (por ejemplo, base de datos caida: el limite de
// intentos tambien vive en la base), la libreria lanza la excepcion en lugar de responder. Aca se
// captura y se contesta siempre un error generico: sin SQL, trazas, hosts, tokens ni secretos,
// ni en la respuesta ni en los logs. Modulo puro: no importa Next ni `server-only`.

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

function respuestaDeError(status: number, codigo: string, mensaje: string): Response {
  return Response.json({ code: codigo, message: mensaje }, { status, headers: { "cache-control": "no-store" } })
}

export async function atenderSolicitudAuth(obtenerRespuesta: () => Promise<Response>): Promise<Response> {
  try {
    return await obtenerRespuesta()
  } catch (error) {
    const codigos = codigosDe(error)
    const sinConexion = codigos.some((codigo) => CODIGOS_DE_CONEXION.has(codigo))
    // Solo el tipo y el codigo, nunca el mensaje ni la traza: pueden incluir datos de la solicitud.
    console.error("[auth] fallo interno al atender la solicitud", {
      tipo: error instanceof Error ? error.name : typeof error,
      codigos,
    })
    return sinConexion
      ? respuestaDeError(503, "SERVICIO_NO_DISPONIBLE", "El servicio no está disponible. Probá de nuevo en unos minutos.")
      : respuestaDeError(500, "ERROR_INESPERADO", "Ocurrió un error inesperado. Probá de nuevo en unos minutos.")
  }
}
