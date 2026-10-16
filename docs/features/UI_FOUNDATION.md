# UI foundation / application bootstrap

## RF relacionado
PENDIENTE: SRS validada aún no incorporada. No se asignan identificadores.

## CU relacionado
PENDIENTE: artefactos RUP corregidos aún no incorporados.

## Objetivo
Primera base ejecutable Next.js dentro del repositorio existente, conservando la UI aprobada de staging.

## Contexto
Tarea humana explícita acepta Next.js full-stack, TypeScript, PostgreSQL futuro y monolito modular. Ver ADR-002 y MIGRACION_UI.md. Staging no se modifica.

## Reglas de negocio
Se mantienen REGLAS_DOMINIO.md; esta entrega presenta mocks sin ejecutar operaciones de dominio ni aplicar disponibilidad real.

## Criterios de aceptación
- [x] Home, catálogo, PDP, local y prueba social con UI aprobada.
- [x] Login mock y shell administrativo navegable con avisos de demostración.
- [x] Lint, typecheck y build funcionando.
- [x] Rutas comprobadas a 1440×900 y 390×844 y comparación con staging.
- [x] Mocks centralizados; sin rutas legacy, paquetes muertos ni tracking.
- [x] Docs y ADR actualizados; trabajo en feature/ui-foundation.
- [ ] Revisión humana del PR y trazabilidad definitiva a SRS/RUP.

## Fuera de alcance
ORM, conexión PostgreSQL, auth/sesiones/cookies, API/Server Actions de negocio, CRUD, persistencia, tests framework, deployment y CI definitivo.

## Casos de error
Slug inexistente: 404; filtros sin resultados: estado vacío. Login no valida identidad y no otorga una sesión. Ninguna acción mock debe guardar o enviar datos reales.

## Tests esperados
Lint, typecheck, build y revisión manual de rutas, responsive, navegación, consola y equivalencia visual. No se instala suite de testing.

## Dependencias
UI aprobada y autorización de arquitectura recibidas. RF/CU, herramientas de auth/persistencia/testing y revisión humana pendientes.

## Notas/decisiones
No considerar esta entrega un sistema seguro o funcional para operar el negocio. El PR no se aprueba ni mergea automáticamente.
