// Configuracion que carga la CLI de Better Auth para generar el schema de Drizzle:
//   pnpm dlx auth@1.7.11 generate --config scripts/auth/config-generar-schema.ts \
//     --output lib/infraestructura/esquemas/auth.ts
// Usa un Drizzle "mock" sin conexion: generar el schema no necesita base de datos ni secretos.
// Volver a generarlo al actualizar Better Auth o al agregar plugins, y revisar el diff: el
// archivo del schema tiene ajustes manuales (fechas con zona horaria, indices) que se repiten
// a mano; el encabezado de lib/infraestructura/esquemas/auth.ts los lista.
import { drizzle } from "drizzle-orm/node-postgres"
import { crearAuth } from "../../lib/infraestructura/auth-config"

export const auth = crearAuth(drizzle.mock())
