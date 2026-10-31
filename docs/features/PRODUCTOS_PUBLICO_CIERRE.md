# Producto/publico/SEO independientes de Cloudinary

## RF y CU relacionados

RF-03..07 de referencia suministrada; decisiones A/C/L y destacado de la actualización 8, [blueprint](../BLUEPRINT_IMPLEMENTACION_MVP.md), ADR-003/007/008 y change `implement-products-public-seo`. CU exactos pendientes de formalización con RUP; no se crean identificadores ni se certifica aceptación académica.

## Objetivo y contexto

31/10/2026. Por solicitud expresa se trabaja secuencialmente desde main/origin `86cf98d`, rama independiente `feature/productos-publico-cierre`. `feature/productos-2-2-imagen` se conserva sin cambios en `dde6b2b`: primera imagen implementada, smoke real Cloudinary bloqueado por las tres credenciales ausentes. No se incorpora ninguno de sus commits. La confirmación humana de 1.1 permanece registrada en aquella rama; su integración documental no se adelanta aquí.

## Producto 2.4

`publicacion.ts` implementa publicar/ocultar/destacar/quitar destacado. Cada comando usa `conAdministradora`, Zod (UUID, versión positiva y acción allowlist) y una transacción con lock de Producto. Solo escribe el flag correspondiente, versión y fecha; una versión obsoleta se rechaza. Ocultar/destacar no exige imagen ni saldo; publicar exige referencia persistida completa y URL HTTPS utilizable. El constraint de P0 ya exige conjunto completo; no se consulta ni simula Cloudinary. La validación del archivo/proveedor pertenece a 2.2.

`publicacion-acciones.ts` compone el guard real, conserva protección de origen nativa de Actions, devuelve errores técnicos neutros e invalida paths únicamente después del commit. No añade UI anticipada de 2.5 ni permite borrar productos. Los cambios no tocan Auth, Inventario, contratos compartidos, schema o migraciones.

Aceptación: ausencia de sesión sin lecturas/escrituras; imagen requerida al publicar; oculto sin imagen permitido; cuatro acciones conservan datos/slug/precio/imagen/saldo; inexistente/versionado inválido/conflicto distinguidos; carreras no sobrescriben. Pruebas específicas: `publicacion.integracion.test.ts`, PostgreSQL aislado del arnés existente, referencias de imagen insertadas solo en test sin red/proveedor falso de runtime.

## Fuera de alcance y dependencias

2.2 no cerrada, 2.3 sin implementar. 2.5 solo planificación hasta integrar imagen/reemplazo. Sin carga demo, borrado de fixtures, nuevas tablas, nuevas dependencias ni infraestructura. Dominio productivo, catálogo comercial y credenciales reales siguen siendo requisitos operativos pendientes; no se inventan valores.

## Checkpoints

Los resultados se registran por task al terminar su validación. Ningún check anterior representa el smoke Cloudinary. No merge ni push por instrucción de esta entrega.

### Bloqueo local de validación — 31/10/2026 (histórico, resuelto)

2.4 queda **parcial**, sin marcar completa: implementación y siete escenarios PostgreSQL preparados, sin ejecución satisfactoria. El arnés falla al conectar a `127.0.0.1:62075` (ECONNREFUSED). Docker Desktop no estaba iniciado; tras iniciarlo y reiniciarlo una vez, aborta por `initializing Inference manager` / socket `Docker/run/dockerInference` inaccesible. No se cambian opciones del motor ni se borran contenedores/volúmenes/datos para resolverlo. El fallo coincide con [el incidente reportado en Docker](https://github.com/docker/desktop-feedback/issues/554), sin asumir que la reparación de otra máquina sea aplicable a esta.

Los tipos ignorados `.next/dev/types` de 2.2 apuntaban a su Handler ausente en main; se apartaron reversiblemente a `work/tipos-next-22-20261031`, sin tocar código/configuración. `pnpm typecheck` pasó después. Lint, build, `db:check`, `db:generate` (11 tablas, sin cambios), OpenSpec strict (3/3), doctor saludable y diff-check correctos. `pnpm test`: **240 pruebas / 32 archivos**, incluidas tres nuevas de frontera (sin sesión, fallo técnico del verificador, entrada inválida sin transacción). No son evidencia SQL: las siete pruebas de integración de 2.4 siguen pendientes de ejecución. El build todavía genera el público de fixtures porque no se implementó 3.x.

La instrucción de trabajar secuencialmente exige probar/confirmar cada checkpoint antes del siguiente. Por ello no se inicia 3.1, y 3.2–3.4/4.1–4.4 permanecen sin implementar en esta rama. E2E de público real no aplica todavía; los E2E con DB tampoco pueden validarse hasta recuperar el servicio. No se elimina ni migra ninguno de los siete fixtures. No hay relacionado real ni seed nuevo.

Para retomar: recuperar Docker Desktop sin reset de datos, iniciar el contenedor existente `angel-tears-local-pg17`, ejecutar integración de `publicacion.integracion.test.ts` y regresión Producto/Inventario, verificar guard real con sesión y cerrar 2.4 solo si pasan. Después seguir 3.1 → 3.2 → 3.3 → 3.4 → SEO 4.x. 2.5 queda para listado con CTA Nuevo producto, alta dedicada, edición, categoría/filtro y menú accesible; integrar sus acciones de imagen únicamente después de 2.2/2.3.

Integración futura de 2.2: no hay dependencia de sus archivos ni cambios de package/lock, contratos o schema. Ambas ramas editan `tasks.md`; conciliar las notas y conservar su cierre humano de 1.1 y estado real de 2.2. Sus cambios de UI/DTO de imagen no se copian en esta rama. Tras combinar, repetir checks de edición/versionado y público; la referencia publicada deberá provenir del upload real validado en 2.2.

### Cierre de 2.4 — 31/10/2026

Docker ya operativo por intervención del responsable. Se inició únicamente `angel-tears-local-pg17`, conservando volumen y datos. Conexión PostgreSQL real confirmada y hashes de las tres migraciones de desarrollo coinciden con `0000_auth-base`, `0001_catalogo-proveedores-base`, `0002_inventario-base`; no hizo falta aplicar ni generar migraciones. **7/7** escenarios de publicación pasan; regresión conjunta **52/52** Producto/Inventario, incluida la prueba existente con verificador Better Auth real. Las tres pruebas unitarias de frontera comprueban ausencia de acceso ante sesión inexistente/fallo del verificador/entrada inválida. Typecheck, lint específico, OpenSpec strict y diff-check correctos. Se cierra 2.4 al nivel de comandos/Action autorizado, sin adelantar UI de 2.5 ni afirmar upload real.

### Cierre de 3.1 — 31/10/2026

Consultas de Catálogo con DTO público explícito: precio decimal string/ARS, categoría, opcionales existentes, imagen HTTPS/dimensiones/alt y disponibilidad booleana. Sin saldo exacto, mínimo, versión, actor o identificadores del proveedor. JOIN explícito de solo lectura autorizado en blueprint sección 6; nunca escrituras a Inventario ni cambios en su código/contratos. Una sola consulta para filtrar publicado+stock>0, categoría, destacados, exclusión y límite, orden estable por UUID sin ranking. PDP solo exige publicado; agotado devuelve disponible=false, oculto/inexistente null. Fallos técnicos se propagan. Cinco pruebas PostgreSQL, lint específico, typecheck, OpenSpec strict y diff-check correctos. Sin dependencia de código/credenciales de 2.2.

### Cierre de 3.2 — 31/10/2026

Catálogo y PDP RSC consumen la proyección real, sin SSG de los siete fixtures, que se conservan intactos. Filtro de las siete categorías aprobadas; vacío de catálogo y vacío de filtro distintos. Precio formateado con BigInt/string, sin redondear centavos grandes. Imagen persistida con alt real, estado disponible/Sin stock y opcionales solo cuando existen. Se conserva composición/estilos y contactos/entrega confirmados; se retiran textos de muestra y cuidados/materiales no propios del registro. Relacionados usan la misma consulta con categoría/exclusión/límite tres. Sin tabla ni configuración adicional.

Metadata básica y PDP comparten `cache` de React solo por solicitud. Catálogo/PDP `force-dynamic`, sin caché persistente; links de producto sin prefetch para no anticipar una ficha que luego se oculte. Errores SQL se redactan antes de llegar al boundary; reintento hace recarga real (reset de un error RSC sin petición nueva no recuperaba el dato). Oculto/inexistente responde HTTP 404; un fallo técnico no se transforma en null/lista vacía. La política integral de Home/stock se completa en 3.4.

Evidencia: cinco E2E con servidor Next de producción/base `_test` (tres viewports, HTML sin JS y error SQL/recuperación). La imagen HTTPS del dataset de pruebas se responde con un asset local solo en el navegador de prueba, sin proveedor remoto. El error SQL renombra temporalmente la tabla de la base aislada y siempre restaura en finally; no toca desarrollo/migraciones. Un test unitario comprueba precio exacto; cinco PostgreSQL de proyección se conservan verdes. Lint/typecheck/build/OpenSpec/diff correctos. Capturas desktop y mobile inspeccionadas, sin desborde horizontal; no equivalen a aceptación Cloudinary.
