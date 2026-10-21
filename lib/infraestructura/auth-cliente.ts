import { createAuthClient } from "better-auth/react"

// Cliente de Better Auth para el navegador (ADR-004). Habla con /api/auth/* del mismo origen;
// las cookies de sesion las gestiona la libreria (HttpOnly): el codigo del cliente nunca las ve
// ni guarda tokens en localStorage.
export const authClient = createAuthClient()
