# Plan de implementación

Actualización autorizada del 19/10/2026. El [blueprint](BLUEPRINT_IMPLEMENTACION_MVP.md) contiene diseño global y dependencias; este plan resume rondas sin duplicar contratos ni estimar fechas. No inicia implementación.

| Etapa | Propósito |
| --- | --- |
| Base existente | UI Foundation integrada; mapa y decisiones documentados. Negocio/auth/BD no implementados. |
| Preparación global actual | Blueprint, ADR, trazabilidad, OpenSpec y tres changes R1; un commit de preparación sin ejecutar tareas. |
| Ronda 1 — Emi | Auth/Cuenta, Drizzle común necesario, provisión, sesión, login/logout/guard, Resend/reset/cambio contraseña y tests. |
| Ronda 1 — Claudio | Inventario/mínimos/ajustes/historia, Proveedores y Compras multilínea/anulación transaccional; consume Producto único. |
| Ronda 1 — Augusto | Producto, imagen/categorías/destacado/publicación/slug; experiencia pública/SEO y disponibilidad real con Inventario. |
| Ronda 2 — sin responsables asignados | Ventas; Egresos/Finanzas; Dashboard operativo. Solo roadmap, sin changes activos. |
| Ronda 3 — sin responsables asignados | Tema admin persistente; integración/hardening/gaps/E2E, production readiness/deploy autorizado, SEO final/Search Console y observabilidad cuando se decida. Solo roadmap. |

R1 avanza con hitos E0/P0/C0 del blueprint: DB/guard/arnés, Producto/DTO y contrato Inventario temprano. Proveedores/reglas/pruebas puras avanzan antes de integrar dependencias. No aceptar integración con guard/saldo ficticio ni generar migraciones simultáneas con journals distintos.

Cada entrega concreta requiere una tarea con criterios de aceptación y la [definición de terminado](DEFINICION_TERMINADO.md).


Navegación/gráficos actuales siguen siendo demostración, no requisitos. Seguridad/pruebas acompañan cada slice, sin postergarlas a R3. La preparación termina después de validar e integrar documentación/OpenSpec; no inicia ninguno de los tres changes.
