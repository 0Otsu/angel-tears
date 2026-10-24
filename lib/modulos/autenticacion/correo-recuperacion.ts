import type { MensajeCorreo } from "@/lib/infraestructura/correo"

// Mensaje de recuperacion de contrasena. Texto plano y HTML minimo, sin imagenes ni rastreo.
// El enlace lo arma Better Auth con la URL base confiable (BETTER_AUTH_URL), no con datos de la
// solicitud. El enlace dura 1 hora y sirve una sola vez; se avisa en el propio mensaje.

function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function construirCorreoRecuperacion(datos: { para: string; url: string }): MensajeCorreo {
  const texto = [
    "Hola,",
    "",
    "Recibimos un pedido para restablecer la contraseña de Angel Tears. Abrí este enlace para elegir una nueva:",
    "",
    datos.url,
    "",
    "El enlace sirve una sola vez y vence en 1 hora. Al cambiar la contraseña se cierran todas tus sesiones.",
    "Si no lo pediste vos, ignorá este mensaje: tu contraseña no se modifica.",
    "",
    "Angel Tears",
  ].join("\n")

  const enlace = escaparHtml(datos.url)
  const html = [
    "<p>Hola,</p>",
    "<p>Recibimos un pedido para restablecer la contraseña de Angel Tears. Abrí este enlace para elegir una nueva:</p>",
    `<p><a href="${enlace}">Restablecer mi contraseña</a></p>`,
    `<p>Si el botón no funciona, copiá esta dirección en el navegador:<br>${enlace}</p>`,
    "<p>El enlace sirve una sola vez y vence en 1 hora. Al cambiar la contraseña se cierran todas tus sesiones.</p>",
    "<p>Si no lo pediste vos, ignorá este mensaje: tu contraseña no se modifica.</p>",
    "<p>Angel Tears</p>",
  ].join("\n")

  return { para: datos.para, asunto: "Restablecer tu contraseña de Angel Tears", texto, html }
}
