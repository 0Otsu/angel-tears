import { crearConexionBd, type ConexionBd } from "@/lib/infraestructura/db"
import { validarUrlBdPruebas } from "@/pruebas/guardia-url-bd"

// Arnes de PostgreSQL aislado para pruebas de integracion (ADR-006): abre la conexion solo si
// el guard acepta la base de pruebas.
export function crearConexionPruebas(): ConexionBd {
  const url = validarUrlBdPruebas(process.env.DATABASE_URL_TEST, process.env.DATABASE_URL)
  return crearConexionBd(url)
}
