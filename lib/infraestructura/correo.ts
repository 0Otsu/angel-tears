import { Resend } from "resend"

// Envio de correo transaccional (ADR-004). Resend SOLO entrega el mensaje de recuperacion de
// contrasena: Better Auth genera y valida el token. No se usa para marketing, newsletters,
// pedidos ni otras notificaciones; ampliar su uso requiere una decision nueva.
//
// Modulo sin dependencias de Next, para usarlo desde la configuracion de Better Auth, los tests
// y los scripts. Nunca registra ni devuelve el contenido del mensaje (lleva el enlace con el
// token), la clave de API ni el detalle del proveedor.

export type MensajeCorreo = { para: string; asunto: string; texto: string; html: string }
export type EnviarCorreo = (mensaje: MensajeCorreo) => Promise<void>

/** Falta configurar el envio (RESEND_API_KEY o RESEND_FROM). El mensaje no incluye valores. */
export class ErrorConfiguracionCorreo extends Error {
  constructor(variable: string) {
    super(`Falta la variable de entorno ${variable}: no se pueden enviar correos.`)
    this.name = "ErrorConfiguracionCorreo"
  }
}

/** El proveedor rechazo el envio. Solo guarda el codigo, nunca el detalle ni el mensaje. */
export class ErrorEnvioCorreo extends Error {
  readonly codigo: string
  constructor(codigo: string) {
    super("El proveedor de correo rechazo el envio.")
    this.name = "ErrorEnvioCorreo"
    this.codigo = codigo
  }
}

// Parte minima del SDK de Resend que se usa; permite reemplazarla en las pruebas.
type ClienteResend = {
  emails: {
    send(entrada: {
      from: string
      to: string
      subject: string
      text: string
      html: string
    }): Promise<{ error: { name?: string; statusCode?: number | null } | null }>
  }
}

export function crearEnviadorResend(config: {
  apiKey: string
  remitente: string
  cliente?: ClienteResend
}): EnviarCorreo {
  const cliente: ClienteResend = config.cliente ?? new Resend(config.apiKey)
  return async (mensaje) => {
    const { error } = await cliente.emails.send({
      from: config.remitente,
      to: mensaje.para,
      subject: mensaje.asunto,
      text: mensaje.texto,
      html: mensaje.html,
    })
    if (error) {
      throw new ErrorEnvioCorreo(error.name ?? String(error.statusCode ?? "desconocido"))
    }
  }
}

/** Arma el enviador con RESEND_API_KEY y RESEND_FROM, leidos al enviar (no al importar). */
export function crearEnviadorDesdeEntorno(): EnviarCorreo {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new ErrorConfiguracionCorreo("RESEND_API_KEY")
  const remitente = process.env.RESEND_FROM
  if (!remitente) throw new ErrorConfiguracionCorreo("RESEND_FROM")
  return crearEnviadorResend({ apiKey, remitente })
}
