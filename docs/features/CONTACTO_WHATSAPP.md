# Contacto público por WhatsApp

## RF relacionado
PENDIENTE: SRS validada aún no incorporada.

## CU relacionado
PENDIENTE: artefactos RUP corregidos aún no incorporados.

## Objetivo
Activar WhatsApp en la navegación y ofrecer «Ver WhatsApp» junto a «Ver Instagram» en Contacto.

## Contexto
El usuario confirma el teléfono comercial +54 9 3454 26-6760 el 16/10/2026. Se centraliza su enlace `https://wa.me/5493454266760` en negocioPublico y se sustituye también el pendiente del footer.

## Reglas de negocio
Contacto público según ALCANCE.md; sin cambios de dominio. Abrir conversación no envía mensajes automáticamente.

## Criterios de aceptación
- [x] Ícono del header habilitado, con nombre accesible y enlace al número confirmado.
- [x] Botón «Ver WhatsApp» en Contacto reutiliza el estilo de «Ver Instagram».
- [x] Contacto y footer muestran el número confirmado, sin mensajes de canal pendiente.
- [x] `pnpm lint`, `pnpm typecheck` y `git diff --check` aprobados; tres enlaces con URL correcta y rel seguro. Revisión desktop/móvil sin desborde; botones de contacto de 52 px de alto en móvil.
- [x] Revisión humana aprobada y cierre del PR #1 solicitado el 16/10/2026.
- [ ] Trazabilidad RF/CU definitiva.

## Fuera de alcance
Mensajería automática, API de WhatsApp, backend, BD, dependencias y deployment.

## Casos de error
La apertura depende de la disponibilidad de WhatsApp/aplicación o sesión web del visitante; el número visible permite identificar el contacto. Instagram sigue disponible.

## Tests esperados
Lint, typecheck y revisión de enlaces y presentación desktop/mobile, sin enviar mensajes ni instalar herramientas. Sin tests nuevos para enlaces de contacto reversibles.

## Dependencias
Número confirmado por el usuario; ninguna dependencia nueva.

## Notas/decisiones
Enlaces externos con target blank y rel noopener noreferrer. Se conserva el servidor LAN en el puerto 3200.

Evidencia de la revisión inicial en `work/whatsapp/` (excluida de Git). No se envían mensajes. El build conjunto se ejecuta como parte del cierre de UI foundation, con evidencia en `work/cierre-ui/`. No corresponden tests de dominio/backend. El responsable autoriza incorporar los enlaces al cierre del PR #1.
