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
- [x] Revisión humana de UI y ajustes finales aprobados; el responsable solicita cierre y merge condicional del PR #1 el 16/10/2026.
- [ ] Trazabilidad definitiva a SRS/RUP.

## Fuera de alcance
ORM, conexión PostgreSQL, auth/sesiones/cookies, API/Server Actions de negocio, CRUD, persistencia, tests framework, deployment y CI definitivo.

## Casos de error
Slug inexistente: 404; filtros sin resultados: estado vacío. Login no valida identidad y no otorga una sesión. Ninguna acción mock debe guardar o enviar datos reales.

## Tests esperados
Lint, typecheck, build y revisión manual de rutas, responsive, navegación, consola y equivalencia visual. No se instala suite de testing.

## Dependencias
UI aprobada y autorización de arquitectura y cierre recibidas. RF/CU y herramientas de auth/persistencia/testing pendientes. No se registra una aprobación de otro integrante en GitHub; la solicitud expresa del responsable autoriza integrar tras las comprobaciones.

## Notas/decisiones
No considerar esta entrega un sistema seguro o funcional para operar el negocio. La solicitud humana de cierre del 16/10/2026 autoriza guardar los ajustes en feature/ui-foundation, actualizar el PR #1 y realizar merge normal si todas las verificaciones pasan; sustituye la instrucción inicial de dejar el PR abierto. No autoriza comenzar la siguiente etapa.

Los ajustes finales comprenden FOTO_LOCAL y CONTACTO_WHATSAPP: imagen del acceso, encuadre responsive, reducción de espacios, CTA de Maps integrado y contacto confirmado. La imagen es una edición de Street View, no una foto nueva tomada con celular. Evidencia y logs del cierre en `work/cierre-ui/`, excluidos de Git.
