// Reemplazo de `server-only` para Vitest. En la aplicacion el paquete real falla si el modulo
// llega a un Client Component; en pruebas de Node no hay bundle de cliente que proteger.
export {}
