import { z } from "zod"

// Largo permitido de la contrasena de la Administradora: es el rango que acepta Better Auth por
// defecto y el que ya se exige al crear la cuenta y al cambiarla. La politica de complejidad
// (mayusculas, simbolos, lista de contrasenas comunes) NO esta definida por producto: no se
// agrega aca.
export const LARGO_MINIMO_CONTRASENA = 8
export const LARGO_MAXIMO_CONTRASENA = 128

export const reglaContrasenaNueva = z
  .string()
  .min(LARGO_MINIMO_CONTRASENA, {
    error: `La contraseña nueva debe tener al menos ${LARGO_MINIMO_CONTRASENA} caracteres.`,
  })
  .max(LARGO_MAXIMO_CONTRASENA, {
    error: `La contraseña nueva admite hasta ${LARGO_MAXIMO_CONTRASENA} caracteres.`,
  })
