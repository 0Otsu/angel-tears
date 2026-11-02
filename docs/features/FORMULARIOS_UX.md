# Formularios: etiquetas, ejemplos y entrada de precio

## Fuente y alcance

Pedido acotado del responsable del 02/11/2026. Base `origin/main` `f059b1d2839bea2d5e50022c054dd58d1167ef17`, rama `fix/formularios-ux-accesibilidad`. Referencias RF-04/05/06/07 del slice; CU/SRS canonicos conservan las brechas de [trazabilidad](../TRAZABILIDAD_MVP.md). No nuevos requisitos, tareas 5.x, dependencias, schema/migrations o reglas comerciales. ADR-003 y validadores actuales preservados.

## Hallazgos y resultado

- Producto ya tenia Label asociado, required nativo, aria-invalid/describedby, foco al primer error y pending. Se conservan. Antes: ayuda permanente de precio con reglas/formato tecnico y entradas largas de una linea. Ahora: ejemplos breves solicitados, sin sustituir etiquetas, y textarea para Descripcion/Cuidados.
- Precio: `Ej: 33000`; ayuda tecnica retirada. Solo al recibir error del servidor se presenta la correccion pertinente: obligatorio, mayor a $0, exceso de decimales, importe fuera de rango o formato invalido.
- `33000`, `33000,50` y `33000.50` se adaptan en UI al decimal exacto actual mediante el normalizador existente, sin floats/redondeo. El servidor sigue validando precio positivo, precision y limite. No se interpretan separadores de miles ambiguos (`33.000,50` se rechaza). El editor recibe precio normalizado; el texto escrito se conserva, sin crear un falso borrador tras guardar.
- Filtros reales de Productos: etiquetas antes ocultas ahora visibles y asociadas a busqueda/categoria/estado, incluso despues de escribir o elegir. Sin nuevos filtros ni cambios de comportamiento.
- Acceso/recuperacion: retirados placeholders que repetian el label. Se conservan autocomplete, tipos, required, errores, foco y toda la logica Auth. Cambio/restablecimiento ya tenian etiquetas visibles y ayuda pertinente; sin cambios. Publico sin campos editables que necesiten correccion. Mocks no modificados.

## Reutilizacion y criterios de aceptacion

- [x] Input, Label, PendingButton y paneles existentes; solo se agrega Textarea presentacional con el mismo borde/foco/tipografia. Sin framework de formularios ni wrappers de dominio nuevos.
- [x] Etiquetas persistentes, obligatorios anunciables, inputMode decimal, select nativo y tabulacion natural; errores asociados y textuales, entradas conservadas.
- [x] Coma/punto e importes grandes exactos; cero/negativos/precision/overflow siguen rechazados. Alta/edicion PostgreSQL verificadas desde navegador, sin mutar datos de desarrollo.
- [x] Reflow a 320/390/768/1440 y viewport de 640 equivalente al layout de 1280 al 200%; sin scroll horizontal, acciones disponibles. No se afirma prueba con lector de pantalla fisico: se inspecciona el arbol accesible del navegador.

## Evidencia y limites

Pruebas focalizadas RTL/dominio y E2E Next produccion contra PostgreSQL aislado: etiquetas, textarea, errores, foco, precision, borrador, alta/edicion/preview/listado; regresion de acceso/recuperacion. Auditoria axe WCAG A/AA sobre el formulario con errores a los cuatro anchos, arbol accesible y capturas desktop/mobile revisadas. Datos descartables de pruebas retirados por el arnes; no se usa Cloudinary ni correo real.

Resultado: 98 unit/component/dominio focalizadas y 19 E2E correctos; los dos nuevos E2E tambien se repitieron tras el ajuste final de altura/capturas. Lint, typecheck, build de produccion del arnes, OpenSpec strict/doctor y diff-check correctos.

Logs locales `work/formularios-*`; capturas/arbol en `test-results/formularios-ux-*` y copia en `work/formularios-ux/` (ignorados). No se ejecuta la suite gigante ni integracion completa de otros modulos: no cambia backend, persistencia, contratos ni logica de Auth/dominio. El E2E prueba la nueva entrada contra validacion/persistencia reales; no se sustituye validacion de servidor por la UI. Accesibilidad automatica/revision basica no equivale a certificacion universal.
