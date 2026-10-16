# Imagen de la fachada del local

## RF relacionado
PENDIENTE: SRS validada aún no incorporada.

## CU relacionado
PENDIENTE: artefactos RUP corregidos aún no incorporados.

## Objetivo
Reemplazar el placeholder de «Vení a conocernos» por la imagen aportada para reconocer el acceso de Entre Ríos 924.

## Contexto
Solicitud humana del 16/10/2026. Fuente: captura de Google Street View aportada por el usuario (interfaz indica noviembre de 2024). Edición con la herramienta integrada image_gen: retirar controles flotantes y conservar fachada, puerta, número, carteles, cables, peatón y atribuciones. No es una fotografía nueva tomada con celular ni acredita el estado actual del comercio. La reconstrucción generativa de áreas tapadas puede introducir diferencias menores; no reemplaza una foto directa del local.

## Reglas de negocio
Sin cambios a REGLAS_DOMINIO.md. La ubicación y el enlace «Cómo llegar» existentes se conservan.

## Criterios de aceptación
- [x] Imagen integrada en el lugar del placeholder, sin controles de navegación de Google.
- [x] Fachada y entrada reconocibles, con número 924 y atribuciones de Google visibles.
- [x] Encuadre CSS centrado en el acceso, más alto en desktop y 4:3 en móvil; asset original sin cambios. Crédito visible bajo la foto.
- [x] Lint, tipos y build aprobados; imagen cargada en desktop 1440×900 y móvil 390×844, sin desborde horizontal. Consola sin errores en la revisión.
- [x] Revisión humana de la imagen y ajustes aprobados en la solicitud de cierre de UI foundation del 16/10/2026.
- [ ] Trazabilidad definitiva RF/CU.

## Fuera de alcance
Otras secciones públicas, Admin, backend y cambios de datos comerciales.

## Casos de error
Si la imagen no carga, el texto alternativo describe el acceso y la información y el CTA siguen disponibles.

## Tests esperados
Lint, typecheck, build y revisión visual desktop/mobile de carga, proporción, atribución y ausencia de desborde. Sin tests nuevos para este cambio de contenido reversible.

## Dependencias
Imagen aportada y UI foundation existente; sin paquetes nuevos.

## Notas/decisiones
Corrección solicitada tras la primera revisión: eliminar padding vertical duplicado, dar altura a la foto y centrar el acceso, moderar el título y ubicar «Cómo llegar» con pin dentro de Ubicación. La sección se renderiza visible sin depender de observers/animaciones de entrada, evitando huecos al navegar al ancla desde móvil. No se vuelve a generar ni editar la imagen.

Corrección verificada a 1440×900 y 390×844: foto cargada, sin desborde, CTA dentro de Ubicación y área de enlace de 44 px de alto en móvil. La foto ocupa 576×692 px en escritorio y aproximadamente 327×245 px en móvil. Lint, typecheck y build aprobados nuevamente; consola sin errores ni advertencias en la revisión. Evidencias: `work/foto-local/ajuste-escritorio.png`, `ajuste-celular.png` y `ajuste-celular-cta.png`.

Asset: `public/images/local/entre-rios-924-street-view.png`. Se conserva la atribución dentro de la imagen. No se modifica staging. Prompt completo y evidencia de comprobación en `work/foto-local/`, excluido de Git.

Prompt resumido: retirar únicamente los controles flotantes, mantener encuadre y aspecto de la fachada, puerta y número 924, conservar carteles, cables, peatón y ambas atribuciones de Google. Herramienta: image_gen integrada, modo edición (sin CLI).

Validación: `pnpm lint`, `pnpm typecheck` y `pnpm build` finalizaron con código 0. Build mantiene el aviso previo de antigüedad de baseline-browser-mapping. No corresponden tests de dominio, validación de servidor ni persistencia para este cambio de imagen. El responsable autoriza incorporar estos cambios al cierre del PR #1.
