import { MAXIMO_PIXELES_IMAGEN, TIPOS_IMAGEN, mensajesErrorImagen } from "./imagen-contrato"

// Ayuda de navegador extraida de 2.2. El decoder/limites del servidor siguen siendo autoridad.
export async function validarImagenSeleccionada(archivo: File, preview: string): Promise<void> {
  if (archivo.type && !(TIPOS_IMAGEN as readonly string[]).includes(archivo.type)) throw new Error(mensajesErrorImagen.tipo_invalido)
  const temporal = new Image()
  await new Promise<void>((resolver, rechazar) => {
    temporal.onload = () => resolver()
    temporal.onerror = () => rechazar(new Error(mensajesErrorImagen.imagen_corrupta))
    temporal.src = preview
  })
  if (temporal.naturalWidth * temporal.naturalHeight > MAXIMO_PIXELES_IMAGEN) throw new Error(mensajesErrorImagen.exceso_pixeles)
}
