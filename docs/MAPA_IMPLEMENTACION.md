# Mapa de implementación del MVP de Angel Tears

Auditoría de análisis y documentación del **16/10/2026**, sobre `main`, commit `9a6677dd1fa243138dd47f9b34077394529b87f4` (UI Foundation integrada mediante PR #1). Referencia para planificar y verificar trabajo futuro; no autoriza implementarlo ni sustituye requisitos o ADR aceptados.

**Arquitectura global — 19/10/2026:** la [sección 31](#31-mapa-vigente-tras-arquitectura-global) es la referencia de planificación vigente para módulos/owners/stack. Las secciones anteriores conservan la auditoría y sus actualizaciones históricas; sus alternativas técnicas antiguas no reabren ADR-003..008 ni sustituyen las nuevas decisiones explícitas. No hay implementación funcional nueva. Modelo/contratos centralizados en [blueprint](BLUEPRINT_IMPLEMENTACION_MVP.md), gaps en [trazabilidad](TRAZABILIDAD_MVP.md).

**Corrección documental final — 19/10/2026:** sesión con máximo absoluto de 30 días desde login, sin extensión por uso diario; recovery de 1 hora, neutro incluso ante fallo de entrega, un uso y revocación global sin auto-login. Cuenta identidad/contraseña/logout en `/admin/cuenta`, Configuración únicamente tema persistente admin-only. Se corrigen referencias puntuales heredadas; no se reescribe la auditoría ni cambia evidencia funcional. Workflow vigente en [GIT_WORKFLOW](GIT_WORKFLOW.md), sin PR/revisión cruzada obligatorios.

**Actualización de decisiones — 19/10/2026:** el responsable aprobó [DECISIONES_PRODUCTO_MVP.md](DECISIONES_PRODUCTO_MVP.md), bloques A–M. Clasificación: «Decisión de producto aprobada por responsable, pendiente de alineación/formalización con SRS/RUP cuando corresponda.» Esta actualización puntual resuelve elecciones de producto en las secciones 27/29 y condiciones relacionadas de recuperación, Configuración y épicos; no reescribe el análisis histórico ni cambia la evidencia de implementación. Las menciones anteriores a decisiones de producto pendientes/propuestas se consultan junto con ese documento. Las alternativas técnicas, fuentes definitivas y vacíos allí identificados siguen pendientes. Ninguna capacidad de negocio pasa a implementada por esta aprobación.

## Lectura rápida y conclusión

**Angel Tears tiene una UI Foundation terminada, pero todavía no tiene un MVP operativo.** Funcionan la navegación pública, contactos externos, presentación de información y controles locales del prototipo. Las operaciones administrativas, la disponibilidad pública y los reportes no consumen datos persistidos ni ejecutan reglas de negocio.

Para completar el MVP faltan: requisitos trazables; acceso a PostgreSQL y migraciones; identidad, sesiones y autorización; gestión de productos/proveedores e inventario; compras, ventas y egresos con anulaciones consistentes; catálogo/PDP con datos reales; resultado económico derivado de operaciones vigentes; estados UX y errores; pruebas funcionales; seguridad, CI y operación en producción. Configuración y recuperación por email requieren distinguir alcance confirmado de propuestas.

**trazabilidad definitiva pendiente de incorporación de SRS/RUP validados**. No se encontraron esos artefactos en los archivos versionados; no se crean identificadores RF/CU. Los nombres de errores y entidades de este mapa son conceptuales, no una API ni un esquema aprobado.

### Cómo consultar este mapa

- Estado y evidencia: secciones 1–3.
- Rutas futuras y cierre de cada módulo: secciones 4–5.
- Identidad, recuperación y cuenta: secciones 6–8.
- Datos, reglas y concurrencia: secciones 9–11.
- UX, mecanismos Next.js y formularios: secciones 12–15.
- Seguridad y calidad operativa: secciones 16–24.
- Dependencias, orden, bloqueos y definición de MVP terminado: secciones 25–28.

## 0. Fuentes, método y límites de la auditoría

### Fuentes y autoridad

Se respeta la jerarquía de [AGENTS.md](../AGENTS.md): SRS validada → RUP corregido → reglas de dominio → ADR aceptados → tarea → sugerencias de IA. Se leyeron README, AGENTS, CLAUDE y los documentos de producto, alcance, arquitectura, dominio, UX/UI, calidad, seguridad, testing, desarrollo, definición de terminado, plan, decisiones pendientes, Git, ADR y features. El [informe de migración](MIGRACION_UI.md) y su [inventario](migracion-ui-inventario.json) son evidencia histórica, contrastada con código actual.

Las propuestas de este mapa se identifican como tales. Los campos del mock no adquieren carácter obligatorio por existir en una tabla. Una necesidad sin fuente suficiente queda bloqueada en su definición, aunque se pueda describir conceptualmente su solución.

### Verificación y alcance efectivo

- `git status`: limpio al comenzar; rama `main`; `git log --oneline -10` revisado.
- Tras `git fetch origin`, `git rev-list --left-right --count main...origin/main`: `0 0`.
- Se inspeccionaron rutas y layouts de `app/`, 34 componentes de `components/`, fixtures/utilidades de `lib/`, siete imágenes de `public/`, configuración y plantillas de `.github/`.
- No hay rutas de negocio `route.ts`, Server Actions de negocio, acceso a BD, esquema físico, librería de auth, pruebas funcionales o workflows CI versionados. La búsqueda de nombres se contrastó con los imports y manejadores de eventos; el componente `testimonials.tsx` no es un test.
- Esta auditoría es estática. No ejecuta formularios, pruebas de penetración, tests funcionales, instalación, lint, typecheck ni build. Los resultados positivos de esas comprobaciones en UI Foundation se citan como **evidencia previa**, no como pruebas nuevas ni pruebas del dominio.
- Solo se crea este documento. No se modifica UI, aplicación, dependencias, staging, servidores, BD, rutas ni configuración; no se crean commits, push o PR en esta tarea.

### Índice de evidencia de código

| Ref. | Archivo inspeccionado | Hecho observable |
| --- | --- | --- |
| E01 | [app/page.tsx](../app/page.tsx), [layout raíz](../app/layout.tsx) | Composición Home, idioma español, fuentes y metadata básica. |
| E02 | [formulario-login.tsx](../components/admin/formulario-login.tsx) | `preventDefault`, reset y `router.push('/admin')`; no verificación de credenciales. |
| E03 | [layout admin](../app/admin/layout.tsx), [estructura-admin.tsx](../components/admin/estructura-admin.tsx) | Metadata noindex, navegación y logout como enlace; sin guard de sesión. |
| E04 | [vistas-modulos.tsx](../components/admin/vistas-modulos.tsx), [tabla-demo.tsx](../components/admin/tabla-demo.tsx), [filas-demo.tsx](../components/admin/filas-demo.tsx) | Seis listados mock, filtros locales, diálogo de lectura y Configuración sin campos. |
| E05 | [admin.ts](../lib/mock/admin.ts), [resumen-admin.tsx](../components/admin/resumen-admin.tsx), [reportes-admin.tsx](../components/admin/reportes-admin.tsx), [graficos-admin.tsx](../components/admin/graficos-admin.tsx) | Stocks y movimientos estáticos; series independientes; cálculo visual y gráficos mock. |
| E06 | [productos.ts](../lib/mock/productos.ts), [catalogo.tsx](../components/publico/catalogo.tsx), [product-grid.tsx](../components/boty/product-grid.tsx) | Siete productos públicos ficticios, categorías locales y selección Home de cuatro. |
| E07 | [PDP: page.tsx](../app/catalogo/[slug]/page.tsx), [detalle-producto.tsx](../components/publico/detalle-producto.tsx) | Slugs mock prerenderizados, metadata por fixture, `notFound()` y acordeones. |
| E08 | [negocio-publico.ts](../lib/negocio-publico.ts), [header.tsx](../components/boty/header.tsx), [contacto.tsx](../components/boty/contacto.tsx), [footer.tsx](../components/boty/footer.tsx) | Contactos reales y navegación; WhatsApp sin mensaje predefinido. |
| E09 | [feature-section.tsx](../components/boty/feature-section.tsx), [testimonials.tsx](../components/boty/testimonials.tsx), [historias-sociales.ts](../lib/mock/historias-sociales.ts) | Acceso del local con atribución y tres historias reales, sin testimonios inventados. |
| E10 | [package.json](../package.json), [next.config.mjs](../next.config.mjs), [eslint.config.mjs](../eslint.config.mjs), [.gitignore](../.gitignore) | Herramientas UI; imágenes `unoptimized: true`; exclusiones de secretos/evidencia. |

Las 13 páginas y tres layouts se enumeraron directamente. Los componentes UI compartidos son 13: accordion, button, chart, dialog, dropdown-menu, empty, input, label, select, sheet, table, tabs y tooltip. Aportan primitivas visuales; no implementan reglas, autorización o persistencia.

## 1. Inventario actual real

| Elemento | Clasificación real/mock | Estado de implementación y límite |
| --- | --- | --- |
| Next.js, TypeScript, Tailwind y aplicación ejecutable | REAL | ✅ IMPLEMENTADO para UI Foundation; no implica un backend de negocio. |
| Monolito modular y PostgreSQL | PARCIAL | Arquitectura/stack aceptados. 🟡 PARCIAL en estructura: no existen módulos de dominio o integración PostgreSQL. |
| Home y composición Boty | REAL + MOCK | 🟡 PARCIAL como superficie MVP: navegación real y contenido comercial parcial; selección de productos mock. |
| Navbar/footer, menú móvil y anclas | REAL | ✅ IMPLEMENTADO en navegación; sin enlace público destacado a Admin. |
| WhatsApp, Instagram, Maps | REAL | ✅ IMPLEMENTADO como enlaces, no mensajería propia. WhatsApp: `https://wa.me/5493454266760`; no envía automáticamente. |
| Local e historias | REAL/PARCIAL | 🟡 PARCIAL en contenido: dirección y tres historias aportadas; local usa Street View editado con atribución. Horarios pendientes. |
| Hero, imágenes y textos de productos | MOCK | 🟣 UI/MOCK. Tres imágenes de productos reutilizadas por siete fichas, precios y descripciones demostrativos. |
| Catálogo y PDP | MOCK | 🟣 UI/MOCK en datos. Filtrar categoría y abrir acordeones sí funciona, pero no consulta catálogo comercial ni stock. |
| Login/logout | MOCK | 🟣 UI/MOCK. Único `<form>` de aplicación: campos requeridos de usuario/contraseña; submit solo navega. Logout no invalida sesión. |
| Shell, drawer, buscador y diálogo administrativo | REAL sobre MOCK | 🟣 UI/MOCK como gestión. Sidebar activo, filtros, restablecer filtros y detalle de muestra funcionan en memoria. |
| Productos, stock, proveedores, compras, ventas y egresos | MOCK | 🟣 UI/MOCK. Tablas solo lectura; no hay altas, edición, publicación, confirmación o anulación reales. |
| Resumen y reportes | MOCK | 🟣 UI/MOCK. Selector cambia series locales; resta de importes no consulta operaciones persistidas. |
| Configuración | MOCK | 🟣 UI/MOCK de reserva; mensaje «Prototipo pendiente de definición», sin preferencias ni perfil editables. |
| Metadata y HTML público | REAL/PARCIAL | 🟡 PARCIAL para SEO final: títulos/descripciones, español, PDP inicial y noindex Admin; sin dominio/canonical explícito/sitemap/robots propio. |
| Utilidades y estilo compartido | REAL | ✅ IMPLEMENTADO para composición visual: `lib/utils.ts` combina clases con clsx/tailwind-merge y globals.css aporta tokens/estilos; no contienen servicios de dominio. |
| Estados de interfaz | PARCIAL | 🟡 PARCIAL: vacío de búsqueda admin, `required` del login, montaje de gráficos y 404 PDP. No hay estados de operaciones remotas. |
| BD, autenticación, sesiones, autorización y reglas de negocio | NO IMPLEMENTADO | ❌ NO IMPLEMENTADO. Tener componentes servidor no equivale a tener estas capacidades. |
| Pruebas funcionales, CI, deployment y observabilidad | NO IMPLEMENTADO | ❌ NO IMPLEMENTADO. Existen comandos técnicos y revisión manual histórica; no suite funcional ni pipeline. |

### Diferencias que impedirían operar con los mocks

- E06 expone siete productos; el inventario administrativo E05 contiene seis. No son una única fuente comercial.
- E05 marca Anillo Celeste con stock cero y Aros Luna/Tobillera Serena ocultos; E06/E07 igualmente los muestran. **El filtro público de visibilidad/disponibilidad no está implementado.** Es una limitación explícita del prototipo, no una regla futura aceptada.
- El estado «Stock bajo» está escrito en los fixtures; no resuelve `<` o `<=`. La tabla general de stock incluye productos sin mínimo; la consulta específica de stock bajo debe excluirlos.
- El selector de períodos cambia indicadores/gráficos, pero la tabla de ventas de Resumen conserva octubre. Los reportes suman `periodosDemo`, no filtran las listas de movimientos ni aplican anulaciones reales.
- Un `id` mock como `collar-aura` funciona también como slug. La identidad persistida y la política de cambio de URL no están definidas.

## 2. Estados de implementación

| Estado | Significado usado en este documento |
| --- | --- |
| ✅ IMPLEMENTADO | Existe comportamiento verificable para el alcance indicado. Puede aplicarse a un control visual sin certificar el módulo de negocio. |
| 🟡 PARCIAL | Existe una parte real, pero faltan criterios para cerrar la capacidad del MVP. |
| 🟣 UI/MOCK | Presentación y/o interacción local basada en datos ficticios; no representa operación real. |
| ❌ NO IMPLEMENTADO | No existe la capacidad en aplicación. |
| ⚪ DECISIÓN PENDIENTE | Hay que resolver una alternativa técnica/producto; este mapa no la elige. |
| 🔴 BLOQUEADO POR FUENTE/REQUISITO | Falta precisar o validar la definición autorizada. No equivale a «todo análisis debe detenerse». |

Equivalencia con el inventario solicitado: REAL se clasifica como implementado dentro de su límite; MOCK como UI/MOCK; PARCIAL como parcial; ausencia como no implementado. **No se calcula un porcentaje de MVP a partir de pantallas terminadas.**

Ejemplo concreto: `/admin/productos` tiene UI ✅, lectura BD ❌, alta ❌, modificación ❌, visibilidad persistida ❌, validación servidor ❌ y tests funcionales ❌. Estado general: 🟣 UI/MOCK.

## 3. Mapa de rutas actuales

Son **13 patrones de página**: tres públicos y diez administrativos incluyendo login. El patrón PDP tiene siete slugs mock; representan 19 URLs concretas de muestra. `(panel)` es un grupo organizativo, no parte de la URL.

| Ruta | Área | Propósito | Estado actual | Fuente de datos | Protección actual | Funcionalidad real | Qué falta |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | Público | Home, selección, local, historias y contacto | 🟡 PARCIAL | E06/E08/E09, contenido estático | Pública deliberadamente | Navegación, contactos, carrusel y filtros locales | Productos disponibles reales, contenido final y SEO operativo. |
| `/catalogo` | Público | Listado | 🟣 UI/MOCK | Siete fixtures E06 | Pública | Filtro local por categoría y enlaces | Consulta pública validada y estados remotos. |
| `/catalogo/[slug]` | Público | PDP | 🟣 UI/MOCK | `buscarProductoDemo` E07 | Pública | Prerenderizado, acordeones, consulta Instagram, 404 desconocido | Producto real, control de publicación/disponibilidad y revalidación. |
| `/admin/login` | Auth/Admin | Acceso | 🟣 UI/MOCK | Sin fuente de identidad E02 | Pública, noindex | Validación HTML `required`; reset y navegación cliente | Credenciales, sesión, errores y redirecciones seguras. |
| `/admin` | Admin | Resumen | 🟣 UI/MOCK | Series, inventario y ventas E05 | **Ninguna**; noindex | Selector/gráficos/links de muestra | Guard y agregados autorizados coherentes. |
| `/admin/productos` | Admin | Productos y visibilidad | 🟣 UI/MOCK | `productosDemo` E04/E05 | Ninguna | Buscar/filtrar/ver detalle local | Gestión y lectura persistentes. |
| `/admin/stock` | Admin | Existencias y mínimos | 🟣 UI/MOCK | Inventario/estados predefinidos | Ninguna | Buscar/filtrar/ver detalle local | Saldo real, mínimo opcional, consulta bajo mínimo. |
| `/admin/proveedores` | Admin | Referencias de proveedores | 🟣 UI/MOCK | `proveedoresDemo` | Ninguna | Buscar/ver detalle local | Campos validados, consulta y gestión persistente. |
| `/admin/compras` | Admin | Historial | 🟣 UI/MOCK | `comprasDemo` | Ninguna | Buscar/filtrar/detalle de lectura | Registrar, consultar/anular y actualizar stock atómicamente. |
| `/admin/ventas` | Admin | Historial | 🟣 UI/MOCK | `ventasDemo` | Ninguna | Buscar/filtrar/detalle de lectura | Registrar, consultar/anular y controlar stock. |
| `/admin/egresos` | Admin | Historial manual | 🟣 UI/MOCK | `egresosDemo` | Ninguna | Buscar/filtrar/detalle de lectura | Registrar/consultar/anular sin doble conteo. |
| `/admin/reportes` | Admin | Resultado y visualizaciones | 🟣 UI/MOCK | `periodosDemo`, `segmentosDemo` | Ninguna | Selector/tabs y cálculo de muestra | Agregados de operaciones vigentes, período aprobado, tests. |
| `/admin/configuracion` | Admin | Reserva visual | 🟣 UI/MOCK | Texto fijo E04 | Ninguna | Mostrar vacío explicativo | ⚪ Definir si hay algo necesario en MVP. |

Anclas de Home: `/#coleccion`, `/#el-local`, `/#de-ustedes`, `/#contacto`; no son rutas nuevas. Los enlaces externos no son endpoints de la aplicación. No existe ruta de logout: «Cerrar sesión» es un enlace a login.

Layouts: `app/layout.tsx` establece HTML/fuentes/metadata; `app/admin/layout.tsx` agrega metadata noindex y devuelve children; `app/admin/(panel)/layout.tsx` monta el shell. Ninguno valida sesión. No hay redirecciones servidor de auth. `notFound()` de la PDP usa la salida 404 del framework; no existe `app/not-found.tsx` propio.

## 4. Rutas objetivo: confirmadas y propuestas

### Confirmadas por el alcance funcional

Home, catálogo, PDP, acceso y área administrativa son superficies confirmadas. La UI aprobada concreta sus rutas actuales. El alcance confirma **operaciones** de productos/stock/proveedores/compras/ventas/egresos/reportes; no confirma URLs adicionales para cada alta o modificación. Configuración no es por sí misma un módulo funcional confirmado.

### Propuestas UX/implementación, sin crear rutas

| Operación | Ruta dedicada candidata | Alternativas | Recomendación de análisis, no decisión aceptada |
| --- | --- | --- | --- |
| Alta/edición producto | `/admin/productos/nuevo`, `/admin/productos/[id]` | Modal, drawer, formulario en listado | Ruta si imágenes/campos requieren espacio y recuperación del contexto; drawer si el formulario validado es breve. |
| Proveedor | `/admin/proveedores/nuevo`, `/admin/proveedores/[id]` | Modal/drawer | Empezar evaluando modal/drawer simple; no exigir nueva página. |
| Compra | `/admin/compras/nueva`, `/admin/compras/[id]` | Formulario inline o drawer ancho | Ruta candidata para múltiples líneas y revisión previa; detalle histórico puede ser ruta o diálogo. |
| Venta | `/admin/ventas/nueva`, `/admin/ventas/[id]` | Misma página/drawer | Evaluar ruta para líneas, stock y errores; venta interna puede elegir producto oculto con stock. |
| Egreso manual | `/admin/egresos/nuevo`, `/admin/egresos/[id]` | Modal/inline | Modal si campos mínimos lo permiten; detalle permanente no obliga URL propia. |
| Visibilidad, mínimo opcional, anulación | Mantener listado/detalle | Confirmación dialog/inline | No crear ruta para cada botón. Anulación requiere resultado servidor y confirmación comprensible. |
| Logout | No exige página | Comando seguro desde el shell | Mutación autenticada; después redirigir a login, sin logout mediante GET. |
| Recuperar/restablecer | `/admin/recuperar`, `/admin/restablecer/[token]` | Flujo gestionado por solución futura | 🔴 Propuesta de producto pendiente de fuentes; ver sección 7. |

Nombres de callbacks, endpoints o rutas `/api/...` dependen del mecanismo elegido. No se definen ahora. No proponer registro público de administradoras, cuentas de clientes o SMS.

## 5. Mapa por módulo y criterios de terminado

Regla transversal para las fichas: lectura y escritura administrativas requieren sesión y autorización servidor; el cliente solo mejora la experiencia. Campos, formatos y contratos no definidos se mantienen PENDIENTES. El criterio «terminado» exige evidencia funcional, además de la [definición de terminado](DEFINICION_TERMINADO.md).

### 5.1 Autenticación

| Aspecto | Mapa |
| --- | --- |
| Estado/evidencia | 🟣 UI/MOCK; E02/E03. No existe cuenta, sesión ni autorización. |
| Operaciones/datos | Iniciar/cerrar sesión confirmados. Email + contraseña y persistencia entre aperturas son experiencia deseada de esta auditoría, pendiente de formalizar; cuenta activa, identificador y mecanismo de credenciales. |
| Dominio/persistencia | Una administradora inicial; sin alta pública ni multiadmin. Sesión verificable y revocable; almacenamiento según ADR, no esquema decidido. |
| Validaciones/permisos | Credenciales en servidor, usuario habilitado, límites de intentos y destino interno seguro; verificar cada lectura y mutación privada. |
| UX/errores | Submitting, error neutro, sesión expirada, redirecciones, acceso denegado y fallo inesperado sin filtrar secretos. |
| Tests/dependencias | Login correcto/incorrecto, reapertura, expiración absoluta a 30 días incluso con uso diario, revocación/logout y acceso directo. ADR-004 y provisión inicial segura. |
| Terminado | Identidad validada en servidor; persistencia razonable acordada; rutas/datos y mutaciones protegidos; logout invalida; pruebas positivas y negativas pasan. Recuperación solo si se aprueba su alcance. |

### 5.2 Productos

| Aspecto | Mapa |
| --- | --- |
| Estado/evidencia | 🟣 UI/MOCK; E04/E06. Ningún alta, edición o cambio real de visibilidad. |
| Operaciones/datos | Gestionar producto, consulta, alta/modificación y publicación/ocultación como desarrollo de la gestión prevista; detalle exacto a validar. Identidad, información pública, precio e imagen candidatos; categoría, materiales/medidas y límites no se fijan por el mock. |
| Dominio/persistencia | Publicado/oculto; ocultar no elimina y puede revertirse. Producto oculto puede venderse con stock. Referencias históricas deben sobrevivir a cambios del producto. Eliminación física no se agrega como requisito. |
| Validaciones/permisos | Servidor valida campos aprobados, identidad/slug, precio según moneda/reglas futuras, referencias y acceso; comprobar colisiones y actualizaciones simultáneas. |
| UX/errores | Loading, vacío real vs filtros, formulario, submitting, guardado, errores por campo, no encontrado y conflicto de edición. |
| Tests/dependencias | Alta/edición consultables tras recarga; ocultar/republicar; separación público/interno; importes históricos intactos; permisos. Depende de requisitos, BD, auth, validación e imágenes. |
| Terminado | Gestiona productos persistidos con reglas de visibilidad verificadas en catálogo/PDP y ventas, sin romper historia; estados UX y tests cubiertos. |

### 5.3 Inventario / stock

| Aspecto | Mapa |
| --- | --- |
| Estado/evidencia | 🟣 UI/MOCK; E05. Las etiquetas y saldos están predefinidos. |
| Operaciones/datos | Consultar saldo, mínimo opcional y productos con stock bajo; efectos de compras/ventas/anulaciones. Definir carga/saldo inicial. No asumir ajuste libre, transferencia de sucursal o kardex administrable. |
| Dominio/persistencia | Stock nunca negativo; sin mínimo no participa en consulta de bajo stock. Saldo y mínimo vinculados al producto; historial técnico de efectos candidato para integridad. |
| Validaciones/permisos | Cantidades y unidades, mínimo permitido y comparación `<`/`<=` están 🔴 pendientes. Servidor valida saldo vigente dentro de la operación; el valor mostrado no autoriza una venta. |
| UX/errores | Carga/vacío, sin mínimo, sin stock, bajo mínimo, conflicto por concurrencia; distinguir estas situaciones de caída de BD. |
| Tests/dependencias | Límites, mínimo ausente, compra/venta/anulaciones y dos sesiones sobre el mismo saldo. BD/transacciones, productos y definición del umbral. |
| Terminado | Consulta saldo persistido; umbral aprobado aplicado; toda mutación conserva no negatividad y consistencia bajo concurrencia; sin mínimo excluido de la alerta. |

### 5.4 Proveedores

| Aspecto | Mapa |
| --- | --- |
| Estado/evidencia | 🟣 UI/MOCK; tres referencias ficticias E04/E05. |
| Operaciones/datos | Consulta y gestión necesarias para la administración; alta/modificación candidatas a validar. Identidad/nombre y contacto son candidatos: campos, obligatoriedad y unicidad PENDIENTES. No añadir CUIT, cuenta bancaria o baja por deducción. |
| Dominio/persistencia | Relación aparente con compras; obligatoriedad/cardinalidad y datos históricos del proveedor requieren fuentes. Cambios no deben eliminar compras anteriores. |
| Validaciones/permisos | Validar campos y referencias en servidor; acceso administrativo; errores de duplicación solo donde exista unicidad validada. |
| UX/errores | Lista/vacío/búsqueda, formulario candidato, guardado, error, proveedor no encontrado o referencia incompatible. |
| Tests/dependencias | Crear/modificar/consultar según operación aprobada; referencias históricas y permisos. Depende de fuentes, BD, auth y compras. |
| Terminado | Gestión requerida trazada y persistida, información usable en compras y referencias conservadas; no se exige eliminación no aprobada. |

### 5.5 Compras

| Aspecto | Mapa |
| --- | --- |
| Estado/evidencia | 🟣 UI/MOCK; E04/E05 muestran historial, no registro ni anulación. |
| Operaciones/datos | Registrar/consultar/anular. Compra, líneas de productos/cantidades e importes históricos; proveedor, fecha aplicable y estados exactos requieren validación. |
| Dominio/persistencia | Confirmar aumenta stock y cuenta el importe una sola vez. Anular revierte una sola vez; rechazar si deja stock negativo. Historia e importes no se reescriben. Compra + líneas + efecto de stock se completan juntas o no se aplican. |
| Validaciones/permisos | Servidor valida productos/cantidades/importes y referencias aprobadas; estado actual y saldo al confirmar/anular. Anulación atómica bajo concurrencia. |
| UX/errores | Líneas, revisión, submitting, éxito con referencia, stock insuficiente para reversión, ya anulada, operación inexistente y fallo sin efectos parciales. |
| Tests/dependencias | Incremento correcto, fallo intermedio, duplicación/reintento, anulación única, reversión bloqueada e historia. Productos, inventario, proveedores según fuente, BD y auth. |
| Terminado | Compra persistida coherente con stock y reportes; anulación conserva historia, es única y no genera negativos ni escrituras parciales; integración concurrente probada. |

### 5.6 Ventas

| Aspecto | Mapa |
| --- | --- |
| Estado/evidencia | 🟣 UI/MOCK; E04/E05. No descuenta stock ni verifica disponibilidad. |
| Operaciones/datos | Registrar/consultar/anular ventas internas; líneas con productos, cantidades y precios históricos. Comprador opcional, Consumidor Final admitido; sin módulo obligatorio de clientes. |
| Dominio/persistencia | Confirmar verifica stock y lo descuenta; insuficiente no modifica nada. Oculto con stock se puede vender internamente. Anular reintegra una sola vez; cambiar precio actual no cambia ventas pasadas. |
| Validaciones/permisos | Validar autorización, referencias, cantidades/precios y estado dentro de transacción; controlar saldo actual, no una copia cliente. Fechas, moneda, redondeo y estados detallados pendientes. |
| UX/errores | Stock cambiado durante edición, falta de stock, producto no encontrado, ya anulada, sesión vencida, submitting y resultado inequívoco. |
| Tests/dependencias | Descuento exacto, insuficiente sin efecto, producto oculto, comprador omitido, reintegro único, precio histórico y ventas concurrentes. Productos, stock, BD y auth. |
| Terminado | Registrar y anular afecta stock/reportes exactamente una vez; autorización y rollback probados; la propietaria puede consultar el registro histórico después de recargar. |

### 5.7 Egresos

| Aspecto | Mapa |
| --- | --- |
| Estado/evidencia | 🟣 UI/MOCK; historial manual ficticio E04/E05. |
| Operaciones/datos | Registrar/consultar/anular egreso manual. Identidad, importe histórico, concepto y fecha candidatos; campos, unidades monetarias y períodos PENDIENTES. No introducir clasificación contable no solicitada. |
| Dominio/persistencia | Compras no se descuentan nuevamente como egresos. Conservar egreso anulado y excluirlo del resultado vigente. No modifica stock. |
| Validaciones/permisos | Comando servidor autorizado; importe y estado válidos según definición; separar origen compra de egreso manual en contratos y consultas, no solo en el texto del formulario. |
| UX/errores | Registro, submitting, confirmación de anulación, éxito, inexistente, ya anulado y error de guardado sin duplicación. |
| Tests/dependencias | Registro/anulación/exclusión, historia, reintento, cero duplicación de compras y permisos. BD, auth y reglas de importes/período. |
| Terminado | Egresos manuales persistidos y anulables con historia; resultado los cuenta una vez y excluye anulados; no se duplican compras por diseño ni por consulta. |

### 5.8 Reportes y resumen

| Aspecto | Mapa |
| --- | --- |
| Estado/evidencia | 🟣 UI/MOCK; E05 calcula resta sobre series ficticias. El circular es candidato visual, no métrica aprobada. |
| Operaciones/datos | Consultar resultado aproximado y datos necesarios ya confirmados; sin exportación ni nuevos indicadores obligatorios. Período, fecha aplicable, moneda y redondeo bloquean definición final. |
| Dominio/persistencia | Ventas vigentes − compras vigentes − egresos manuales vigentes. Lectura consistente del origen persistido; importes históricos; ningún anulado ni compra duplicada. |
| Validaciones/permisos | Consulta autorizada, parámetros/período válidos, agregados del servidor. No tomar totales/estados del navegador como fuente. |
| UX/errores | Cargando, período sin operaciones, resultado cero o negativo válido, fallo de consulta y acceso denegado. No presentar error como total cero. |
| Tests/dependencias | Combinar vigentes/anulados de los tres orígenes, límites de fecha, redondeo cuando se apruebe, y consistencia entre resumen/detalle. Depende de compras/ventas/egresos y fuentes. |
| Terminado | Resultado reproducible con operaciones persistidas y fórmula confirmada; mismos criterios en todas las vistas; ninguna métrica ajena al alcance se presenta como validada. |

### 5.9 Catálogo público

| Aspecto | Mapa |
| --- | --- |
| Estado/evidencia | 🟣 UI/MOCK en productos; filtro de categorías local real E06. |
| Operaciones/datos | Listar información pública de productos publicados con disponibilidad. Categorías/filtros actuales son UX existente; su contrato futuro se valida, sin inventar búsqueda avanzada/paginación obligatoria. |
| Dominio/persistencia | Proyección pública de productos + inventario; excluir ocultos y no disponibles según política aprobada. No publicar datos de proveedores, costos, sesiones o administración. |
| Validaciones/permisos | Público sin sesión; validar filtros y límites en servidor; no filtrar una lista privada descargada al cliente. Definición de disponibilidad y caché pendientes. |
| UX/errores | Carga, catálogo vacío, filtro sin coincidencias y error/reintento; actualmente no hay vacío propio del catálogo. |
| Tests/dependencias | Exclusión pública y cambios de stock/visibilidad; contenido inicial, filtros y ausencia de fuga de datos. Depende de productos, stock, imágenes y revalidación. |
| Terminado | Renderiza solo el catálogo comercial autorizado con estado UX correcto y datos frescos según política aprobada; ninguna pieza mock se presenta como real. |

### 5.10 PDP

| Aspecto | Mapa |
| --- | --- |
| Estado/evidencia | 🟣 UI/MOCK; 404 y metadata por fixture implementados E07. |
| Operaciones/datos | Consulta pública por slug y contacto; no compra online. Ficha y relacionados actuales son muestra, no un motor de recomendaciones requerido. |
| Dominio/persistencia | Resolver producto real y política de acceso directo para oculto/sin disponibilidad, todavía 🔴 pendiente. Mostrar solo datos públicos; no inferir 404/410 definitivo para cualquier caso. |
| Validaciones/permisos | Slug/identidad válidos, consistencia con catálogo y stock; no devolver privados mediante URL conocida. |
| UX/errores | Loading, no encontrado real, error de consulta y estado no disponible según fuente; acordeones y volver al catálogo ya existen. |
| Tests/dependencias | Slug válido/inexistente, ocultar/agotarse, cambio de datos y metadata coherente; sin cookies de auth obligatorias. Depende de productos, inventario, imágenes y SEO. |
| Terminado | Ficha comercial persistida, acceso público y semántica SEO correctos ante cada estado aprobado; caché no mantiene indebidamente información oculta. |

### 5.11 Configuración

| Aspecto | Mapa |
| --- | --- |
| Estado/evidencia | 🟣 UI/MOCK de reserva; `ConfiguracionDemo` E04. Sin formulario ni botón Guardar. |
| Operaciones/datos | ❌ NO IMPLEMENTADO; corrección 19/10, producto 8/9: `/admin/configuracion` únicamente tema claro/oscuro persistente de admin, sin efectos en Home/catálogo/PDP. Nombre/email solo lectura, contraseña/logout pertenecen a `/admin/cuenta`; sin edición de identidad ni CMS. Otras sesiones del cambio autenticado pendientes, único bloqueo de ese subflujo. |
| Dominio/persistencia | Ninguna entidad «Configuración» ni tabla genérica obligatoria derivada del alcance actual. Los contactos están en código; un CMS está fuera del MVP. |
| Validaciones/permisos | Si se aprueba una operación, especificar campos y autorización; no exponer secretos de infraestructura en este panel. |
| UX/errores | El vacío explicativo existe. Estados remotos no aplican hasta definir capacidad; no simular guardado. |
| Tests/dependencias | Hoy revisar navegación y aviso. Si se aprueba capacidad, derivar pruebas de su tarea y módulo propietario. |
| Terminado | Preferencia claro/oscuro persistente exclusiva de admin implementada/probada en R3, conforme a actualización 8; no multiusuario, CMS o parámetros fiscales. Cuenta se acepta por separado dentro de Auth. |

## 6. Autenticación, sesiones persistentes y autorización

**Estado:** ❌ NO IMPLEMENTADO; solución técnica ⚪ DECISIÓN PENDIENTE. El flujo objetivo se describe sin elegir librería, estrategia de tokens o proveedor. La preferencia email + contraseña y sesión persistente debe incorporarse a las fuentes; iniciar/cerrar sesión y proteger administración sí están en el alcance actual.

```text
/admin/login (público)
  → email + contraseña
  → validación del servidor y control de intentos
  → credenciales válidas + cuenta habilitada
  → crear/rotar sesión mediante solución madura
  → cookie segura con persistencia limitada
  → /admin

Nueva apertura del administrador
  → verificar sesión en servidor
  → válida: continuar sin pedir credenciales otra vez
  → vencida/revocada: pedir login, sin entregar datos privados
```

### Política conceptual que hay que acordar

| Tema | Comportamiento objetivo y pendiente |
| --- | --- |
| Persistencia | Conservar acceso entre aperturas dentro del máximo absoluto de 30 días desde login. No sesión perpetua ni contraseña guardada por la aplicación. |
| Expiración | Máximo absoluto de 30 días desde login aprobado en producto 9, control servidor y nuevo login al vencer; formalización SRS/RUP pendiente. Verificar configuración de la versión fijada de Better Auth al implementar. |
| Renovación | La actividad diaria no renueva ni extiende el máximo absoluto. Ya no es decisión de producto pendiente. Una sesión vencida/revocada no revive con actividad cliente. |
| Cookie | Evaluar `HttpOnly`, `Secure` en HTTPS, `SameSite` adecuado y ámbito mínimo; expiración del navegador coherente con la del servidor. No guardar credenciales o tokens de sesión en localStorage. |
| Estrategia | Comparar en ADR sesiones respaldadas en servidor y alternativas de la solución elegida; exigir revocación y persistencia deseadas. No fijar JWT o tabla de sesión en esta auditoría. |
| Logout | Comando seguro que invalida la sesión en servidor y elimina la cookie; redirige a login. Volver atrás no debe recuperar datos privados desde caché. |
| Invalidación | Logout/vencimiento y recuperación: reset invalida todas las sesiones previas y exige login. Otras sesiones tras cambio autenticado siguen pendientes, único bloqueo de ese subflujo. Revocar no puede depender de borrar solo la cookie local. |
| Acceso directo | Toda entrada a `/admin` y rutas hijas verifica identidad/autorización servidor; si falta sesión, redirige a login sin cargar datos privados. |
| Login ya autenticado | Sesión válida: redirigir al panel. Sesión inválida: mostrar formulario. No confundir tener una cookie con sesión válida. |
| Retorno tras login | Si se conserva destino original, admitir únicamente rutas internas autorizadas; evitar redirección a URL externa inyectada. |
| Mutaciones/consultas | Verificar autorización en cada punto servidor que acceda a información o ejecute una operación, incluso por llamada directa. La UI no constituye frontera. |
| Errores | Mensaje neutro para identidad/contraseña incorrectas, sin revelar existencia o estado de cuenta; separar indisponibilidad técnica de éxito. No registrar contraseñas ni cookies. |
| Intentos | Rate limiting y respuesta a intentos repetidos; acordar almacenamiento/política sin permitir bloqueo indefinido trivial de la única propietaria. |

La expiración y revocación deben aplicarse en servidor; una cookie persistente solo mantiene el identificador en el navegador. Referencia técnica: [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

Un layout puede ayudar a componer la experiencia, pero no basta como única barrera: las comprobaciones deben proteger datos y comandos, no solo ocultar children. Referencia: [Next.js, autenticación y autorización](https://nextjs.org/docs/app/guides/authentication). Los ejemplos actuales de documentación no se copian ni seleccionan automáticamente para Next 16.0.10.

### Contraseñas, cuenta e identidad

Usar una solución madura; nunca contraseña en claro, cifrado reversible como sustituto del hash ni criptografía propia. La solución deberá ofrecer hashing de contraseñas apropiado y actualización de sus parámetros; algoritmo/parámetros se resolverán en el ADR, sin elegirlos aquí. Referencia: [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

La autenticación identifica a la persona; la sesión conserva ese contexto; la autorización limita sus acciones. Aunque solo haya una administradora, los tres controles siguen siendo necesarios. No se introduce RBAC complejo, invitaciones, registro abierto, SMS, login social o MFA obligatorio sin fuente. [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) sirve como referencia para errores e intentos, no como ampliación automática del producto.

### Criterios verificables del recorrido

- Credenciales inválidas no crean sesión; credenciales válidas no exponen hash o secreto al cliente.
- Cerrar y volver a abrir dentro de la vigencia acordada mantiene acceso; expirar/revocar deja de autorizar tanto páginas como comandos directos.
- Login con sesión válida vuelve al panel; logout seguido de acceso directo solicita autenticación.
- Sesión expirada durante un formulario impide escritura; informar y definir recuperación de datos no sensibles sin persistir credenciales ni duplicar operación.
- Consultas y respuestas privadas no se comparten entre usuarios/contextos mediante caché pública.

## 7. Recuperación de cuenta por email

**Clasificación actualizada el 19/10/2026:** ❌ NO IMPLEMENTADO. J1–J4 de [DECISIONES_PRODUCTO_MVP](DECISIONES_PRODUCTO_MVP.md) aprueban recuperación por email en el MVP, respuesta neutra, enlace temporal de un uso, invalidación de todas las sesiones tras recuperación y vuelta al login. Pendiente de alineación/formalización con SRS/RUP; no se declara RF existente ni se autoriza implementación. Las URLs siguientes siguen siendo propuestas de implementación. El análisis original se conserva sujeto a esta decisión; duración exacta del enlace, reemisión, soporte y solución técnica siguen pendientes.

```text
/admin/recuperar (propuesta)
  → email
  → respuesta neutra, exista o no la cuenta
  → si corresponde: token aleatorio temporal y envío por canal de correo aprobado
  → /admin/restablecer/[token] (propuesta)
  → validar token y nueva contraseña en servidor
  → cambiar credencial + consumir token de forma indivisible
  → invalidar sesiones según política aprobada
  → volver a login (sin inicio automático de sesión)
```

| Riesgo/decisión | Análisis conceptual, condicionado a aprobación |
| --- | --- |
| Enumeración | Respuesta neutra y tiempos razonablemente uniformes. No informar si existe el email, si está bloqueado o si el proveedor rechazó el envío para esa cuenta. |
| Token | Aleatorio, suficientemente impredecible, limitado al restablecimiento, con expiración y un solo uso; almacenar prueba segura del token, no publicarlo en logs. |
| Expiración/reemisión | Duración exacta y política de invalidación de enlaces anteriores PENDIENTES. Una solicitud no cambia contraseña ni bloquea la cuenta. |
| Consumo concurrente | Dos envíos del mismo token no pueden restablecer dos veces: comprobación y consumo atómicos con cambio de credencial. |
| Correo | Proveedor, dominio remitente, configuración y gestión de fallos pendientes de ADR. No se elige Resend u otro servicio ni se crean credenciales. |
| URL | HTTPS en producción, origen de enlace confiable; no construir con un Host no validado. Evitar fugas de token por referencias, analytics o registro de URL completa. |
| Rate limiting | Limitar solicitudes e intentos por cuenta/origen, con política que evite abuso de correo y bloqueo fácil de la propietaria. |
| Errores/UX | Token ausente/expirado/usado o inválido; nueva solicitud, validación por campo, submitting y éxito claro. No filtrar estado interno del sistema. |
| Sesiones | J3 aprobado: invalidar todas las sesiones anteriores tras recuperar contraseña y requerir nuevo login; probarlo. Aviso adicional a la titular no queda aprobado por inferencia. La política del cambio autenticado desde Configuración sigue pendiente. |
| Operación | Correo no entregado o indisponible necesita tratamiento recuperable y logs redactados; decidir procedimiento de soporte seguro para la única cuenta. |

Referencia técnica para respuesta neutra, tokens temporales y uso único: [OWASP Forgot Password](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html). No existe hoy ninguno de estos pasos. Si se aprueba como parte del MVP, pasa a ser criterio de cierre y exige pruebas de expiración, reutilización, concurrencia y fallos de correo; si no, registrar la decisión y la alternativa de recuperación operativa acordada.

## 8. Cuenta administrativa inicial

Una sola administradora está alineada con [PRODUCTO](PRODUCTO.md) y [ALCANCE](ALCANCE.md), que excluyen múltiples administradores y cuentas de clientes. El mecanismo de provisión inicial, email y recuperación deben formalizarse. No crear usuarios desde un registro público por conveniencia técnica.

| Información conceptual de Usuario | Estado de definición |
| --- | --- |
| `id` | Identidad estable necesaria para relacionar sesión y acciones; formato físico pendiente. |
| `nombre` | Candidato para presentación; hoy «Administradora» es texto fijo. Obligatoriedad pendiente. |
| `email` | Identificador deseado para login/recuperación; unicidad conceptual si se aprueba. Normalización y cambio de email pendientes. |
| `passwordHash` o equivalente | Dependerá del mecanismo de credenciales elegido; nunca exponerlo en vistas, respuestas o logs. |
| `timestamps` | Candidatos para creación/actualización y control operativo; campos concretos no aprobados. |
| `estado` | Habilitación conceptual para autorizar o invalidar acceso; valores/transiciones requieren definición. |
| Teléfono | El número comercial confirmado es **contacto del negocio**, no identidad de la cuenta. No requiere por sí mismo columna en Usuario. |

No hay necesidad validada de login por teléfono ni SMS. La elección de email como identificador no habilita automáticamente perfiles editables, verificación por email, múltiples roles o invitaciones. Provisión inicial y conservación de una única cuenta deben ser reproducibles sin credenciales hardcodeadas; el procedimiento se define con auth/persistencia, sin implementarlo aquí.

## 9. Persistencia: mapa conceptual, sin modelo físico

PostgreSQL está aceptado; conexión, acceso a datos, migraciones y política de datos iniciales son ❌ NO IMPLEMENTADO / ⚪ DECISIÓN PENDIENTE. No se crea SQL, schema, tabla, ORM, contrato HTTP ni nombres de columnas definitivos.

| Entidad/concepto candidato | Módulo y relaciones aparentes | Historia/integridad a conservar | Operación transaccional |
| --- | --- | --- | --- |
| Usuario | Auth; una identidad inicial y sus sesiones | Credencial protegida, habilitación; definición exacta pendiente | Cambios de credencial/invalidez según auth. |
| Sesión o mecanismo equivalente | Auth → Usuario | Vigencia, revocación y contexto mínimo; no se decide tabla vs otra estrategia | Crear/rotar/revocar coherentemente según solución. |
| Token de recuperación | Auth → Usuario, **solo si se aprueba** | Expiración/consumo y prueba segura; no retener token sin necesidad | Consumir una vez junto al cambio de contraseña. |
| Producto | Productos; referencias desde stock y líneas de movimientos | Información actual y visibilidad; identidad estable | Edición/visibilidad y control de colisiones según contrato. |
| Inventario/saldo y mínimo opcional | Inventario → Producto | No negatividad, ausencia real de mínimo; saldo inicial pendiente | Efectos de compra/venta y sus anulaciones. |
| Proveedor | Proveedores → compras | No romper registros pasados al actualizar datos | Crear/modificar según operaciones aprobadas. |
| Compra | Compras → líneas; proveedor como relación aparente | Importe histórico y estado; detalle de fecha/anulación pendiente | Cabecera + líneas + incremento/reversión stock. |
| DetalleCompra | Compras → Compra y Producto | Cantidad e importe/costo histórico suficientes para reconstruir operación | Misma unidad atómica que la compra. |
| Venta | Ventas → líneas; comprador opcional | Precio/importe histórico, estado y reversión única | Registro/anulación + stock. |
| DetalleVenta | Ventas → Venta y Producto | Cantidad/precio histórico; no consultar precio actual para reescribir pasado | Misma unidad atómica que la venta. |
| Egreso | Egresos manuales; separado del origen Compra | Importe y estado históricos; anulados conservados | Registro/anulación única según diseño. |
| Movimiento/registro de efecto de stock | Candidato técnico de inventario, derivado de integridad/historia | Relación con operación original y reversión para trazabilidad | Se evalúa dentro de la transacción; no exige UI nueva de ajustes. |
| Recurso de imagen/referencia | Productos → imagen; almacenamiento pendiente | Referencias válidas y conservación cuando estén ligadas a historia | Coordinar BD y almacenamiento; no asumir transacción distribuida. |
| Reporte | Proyección de ventas/compras/egresos, **no tabla obligatoria** | Resultado reproducible con criterios aprobados | Lectura consistente; materialización solo si se justifica luego. |

Las relaciones de cabecera/líneas son aparentes a partir de las entidades y operaciones a analizar, no cardinalidades definitivas de una SRS. Proveedor obligatorio, agrupación de líneas repetidas, comprador, categoría y campos de contacto requieren definición. Consumidor Final no implica crear un registro Cliente.

Persistencia terminada como base: conexión configurada sin secretos versionados, migraciones reproducibles, acceso solo servidor, prueba de lectura/escritura y rollback, aislamiento de entornos, respaldo/restauración y manejo de fallos acordados. No basta con «la conexión responde».

## 10. Reglas de dominio y lugar de cumplimiento

Origen: [REGLAS_DOMINIO.md](REGLAS_DOMINIO.md). Actualmente todas las reglas operativas siguientes están ❌ NO IMPLEMENTADO; etiquetas y fórmulas mock no son cumplimiento.

| Regla confirmada | Punto servidor responsable | Experiencia cliente | Evidencia requerida para cierre |
| --- | --- | --- | --- |
| Ocultar no elimina; republicar permitido | Comando de visibilidad de Productos | Estado y confirmación coherentes | Ocultar/republicar conserva identidad e historia. |
| Público: publicados con disponibilidad | Consultas públicas catálogo/PDP y política de caché | No exhibir piezas no elegibles | Cambios no filtran datos privados ni quedan incorrectamente visibles. |
| Oculto con stock puede venderse internamente | Consulta/comando de Ventas con inventario | Selector interno no copia filtro público | Venta autorizada de oculto con saldo suficiente. |
| Stock nunca negativo | Inventario dentro de cada transacción | Validación anticipada informativa | No se viola con concurrencia, error parcial o anulación. |
| Mínimo opcional; sin mínimo excluido | Escritura de mínimo y consulta de stock bajo | Mostrar «Sin mínimo» | Ausente no se interpreta como cero; umbral aprobado probado. |
| Compra incrementa stock una vez | Confirmación de Compra + Inventario | Submitting y resultado con referencia | Reintento/doble clic no duplica efectos. |
| Compra cuenta una sola vez | Registro de origen y consultas de Reportes/Egresos | No ofrecerla como egreso manual duplicado | Resultado no descuenta compra dos veces. |
| Compra atómica y con importes históricos | Servicio de Compras/transacción | No anunciar éxito antes del commit | Fallo intermedio revierte todo; cambio de precio no altera historia. |
| Anular compra revierte una vez sin negativo | Anulación de Compra + estado + Inventario | Conflicto claro si no se puede revertir | Segundo intento no vuelve a restar; insuficiente deja todo intacto. |
| Venta verifica/descuenta stock | Confirmación de Venta + Inventario | Mostrar disponibilidad orientativa | Insuficiente rechaza sin registrar ni descontar parcialmente. |
| Comprador opcional, Consumidor Final | Validación/registro de Venta | No exigir cliente | Registro válido sin comprador. |
| Venta conserva precios históricos | Registro de líneas/importes de Venta | Detalle muestra datos históricos | Cambiar precio actual no cambia ventas anteriores. |
| Anular venta reintegra una sola vez | Anulación de Venta + estado + Inventario | Confirmación y resultado de operación | Doble petición no duplica reintegro. |
| Egreso anulable con historial | Comando de Egresos | Confirmación; conservar consulta del anulado | Excluir del resultado sin borrarlo. |
| Resultado aproximado excluye anulados | Consulta de Reportes, agregados de las tres fuentes | Mostrar período y fórmula validada | Ventas − compras − egresos manuales vigentes; cero doble conteo. |

**Cliente:** formatos, mensajes tempranos, selección y prevención visual de doble envío. **Servidor:** identidad, autorización, validación estructural y de dominio, estado vigente, transacción y unicidad de efectos. Deshabilitar un botón no protege integridad; TypeScript tampoco valida entradas externas en runtime.

🔴 Permanecen pendientes: disponibilidad exacta y tratamiento de acceso directo; comparación de stock bajo; cantidades/unidades; importes/moneda/redondeo; fechas/períodos; estados detallados y política de correcciones/anulaciones parciales. No se resuelven con valores del mock.

## 11. Transacciones, concurrencia e incertidumbre de resultado

| Operación | Unidad que debe completarse o revertirse | Riesgo a resolver sin elegir SQL |
| --- | --- | --- |
| Confirmar compra | Registro, detalles, importes y aumento de stock | Duplicación por reintento; cabecera guardada sin líneas/saldo. |
| Confirmar venta | Validar referencias y stock vigente; guardar venta/detalles y descontar | Dos ventas leen el mismo saldo y ambas creen disponer de la última unidad. |
| Anular compra | Validar estado y saldo, revertir y registrar anulación | Venta concurrente consume saldo antes de la reversión; anulación doble resta dos veces. |
| Anular venta | Validar estado, registrar anulación y reintegrar | Dos solicitudes concurrentes reintegran dos veces. |
| Egreso/anulación | Estado y efecto único sobre origen consultable | Doble submit o lecturas de reportes inconsistentes. |
| Reset de contraseña, si se aprueba | Validar/consumir token y actualizar credencial; revocación coherente | Reuso concurrente, contraseña cambiada con token aún válido. |

Debe decidirse cómo verificar y modificar saldo/estado de forma indivisible, qué límites de unicidad/versionado o bloqueo hacen falta y cómo tratar contención, timeout y reintentos. No basta una comprobación de saldo antes de abrir la transacción. Varias líneas del mismo producto deben evaluarse conjuntamente según su definición aprobada.

Una respuesta perdida después del commit produce resultado incierto para el navegador. Antes de reintentar, diseñar consulta de resultado o mecanismo de deduplicación; una clave de idempotencia es una alternativa técnica, no un campo de negocio obligatorio decidido aquí. Probar operación concurrente y reintento, con una o varias sesiones de la misma administradora.

Los reportes deben leer un estado consistente de operaciones vigentes. Decidir aislamiento y política de reintento en el diseño de persistencia; no fijar nivel de aislamiento, consultas ni SQL en esta auditoría. La coordinación con almacenamiento de imágenes requerirá compensación/limpieza de fallos cuando BD y archivos no compartan transacción.

## 12. Matriz de estados UX

Las celdas representan **estado actual de soporte al caso futuro**, no solo la presencia de un componente. ✅ existe para el límite indicado; 🟡 es parcial; 🟣 es solo UI/MOCK; ❌ falta cuando aplique; N/A no corresponde al recorrido; `*` solo si la propuesta se aprueba. Para listados, Success significa «datos consultados y mostrados»; para formularios significa operación persistida, por lo que navegar al panel no constituye éxito de login.

### Carga, resultado y formulario

| Pantalla/recorrido | Loading | Empty | Error | Success | Validation error | Submitting |
| --- | --- | --- | --- | --- | --- | --- |
| Home/local/contactos estáticos | N/A | N/A | 🟡 alt/terceros | ✅ navegación/contactos | N/A | N/A |
| Catálogo y selección Home con datos reales | ❌ | ❌ | ❌ | 🟣 lista mock | ❌ parámetros/filtros remotos | N/A |
| PDP real | ❌ | N/A | ❌ | 🟣 ficha mock | ❌ slug/parámetros reales | N/A |
| Login real | N/A | N/A | ❌ | 🟣 navegación | 🟡 required HTML | ❌ |
| Recuperar/restablecer* | N/A | N/A | ❌* | ❌* | ❌* | ❌* |
| Resumen/reportes reales | 🟡 montaje gráfico | ❌ | ❌ | 🟣 series mock | ❌ período | N/A |
| Listados Productos/Stock/Proveedores/Compras/Ventas/Egresos | ❌ | 🟡 sin coincidencias local | ❌ | 🟣 datos mock | ❌ filtros remotos | N/A |
| Detalles administrativos reales | ❌ | N/A | ❌ | 🟣 diálogo mock | ❌ identificador | N/A |
| Alta/edición producto/proveedor; mínimo opcional | ❌ carga de edición | N/A | ❌ | ❌ | ❌ | ❌ |
| Registro compra/venta/egreso | ❌ datos dependientes | ❌ si no hay opciones disponibles | ❌ | ❌ | ❌ | ❌ |
| Visibilidad/anulación/logout reales | N/A | N/A | ❌ | ❌ | ❌ comando/estado | ❌ |
| Configuración sin operación aprobada | N/A | ✅ vacío explicativo | N/A | N/A | N/A | N/A |

«No hay productos/proveedores para seleccionar» no equivale a «BD caída». El vacío de primera carga y el vacío de una búsqueda deben tener acciones distintas cuando corresponda. No hay todavía formularios de negocio: las celdas de estos flujos son necesidades, no pantallas existentes.

### Acceso, inexistencia y conflictos

| Pantalla/recorrido | Not found | Unauthorized | Forbidden | Conflict | Session expired | Unexpected error |
| --- | --- | --- | --- | --- | --- | --- |
| Home/local/contactos estáticos | N/A | N/A | N/A | N/A | N/A | ❌ tratamiento propio |
| Catálogo público | N/A | N/A | N/A | N/A lectura | N/A | ❌ |
| PDP | 🟡 404 fixture | N/A | N/A | N/A lectura | N/A | ❌ |
| Login | N/A | ❌ credenciales inválidas | N/A cuenta tratada de forma neutra | N/A | ❌ aviso tras retorno | ❌ |
| Recuperar/restablecer* | ❌* enlace/token inválido | N/A | N/A | ❌* token consumido | N/A | ❌* |
| Resumen/reportes | N/A | ❌ | ❌ | N/A lectura | ❌ | ❌ |
| Listados privados | N/A | ❌ | ❌ | N/A lectura | ❌ | ❌ |
| Detalle/edición privada | ❌ | ❌ | ❌ | ❌ al guardar edición | ❌ | ❌ |
| Registro compra/venta/egreso | ❌ referencia perdida | ❌ | ❌ | ❌ saldo/reintento | ❌ | ❌ |
| Visibilidad/anulación/logout | ❌ según recurso; N/A logout | ❌ según comando | ❌ | ❌ estado cambiado; N/A logout | ❌ | ❌ |
| Configuración sin capacidad definida | N/A | ❌ protección de ruta | ❌ | N/A | ❌ protección de ruta | ❌ límite global |

En login, el error neutro de credenciales **no está implementado**: solo existe la validación parcial de campos HTML en la primera matriz; no se debe confundir con autenticación. Unauthorized significa ausencia de identidad válida; Forbidden, identidad válida sin permiso. No se asignan códigos HTTP definitivos a estos conceptos.

Para cerrar cada estado: mensaje comprensible, posibilidad de recuperación cuando proceda, conservación razonable de entradas no sensibles, foco correcto, prevención de duplicación y anuncio accesible. Un error inesperado no puede convertirse silenciosamente en una lista vacía, éxito o total cero.

## 13. Next.js / App Router: necesidades y alternativas

Son mecanismos posibles para satisfacer capacidades, no decisiones de implementación tomadas aquí. El proyecto instalado usa Next 16.0.10; verificar compatibilidad al redactar cada tarea, sin copiar automáticamente ejemplos de versiones posteriores.

| Mecanismo | Situación actual | Dónde evaluar y qué debe resolver |
| --- | --- | --- |
| `loading.tsx` / Suspense local | No hay archivo propio. Solo placeholder de montaje de gráfico | Lecturas de catálogo, ficha y listados remotos; carga por segmento o región según contexto. Un skeleton no significa BD conectada. |
| `error.tsx` / límite global | No hay límites propios | Fallos inesperados de lectura/renderizado y recuperación; mensaje seguro con referencia. Errores esperados de formulario/negocio deben tener tratamiento propio, no depender del boundary. |
| `not-found.tsx` / `notFound()` | PDP llama `notFound()` para slug mock inexistente; salida predeterminada | Recurso real inexistente en público/privado, con navegación de recuperación y política validada para ocultos. No disfrazar caída de BD como inexistencia. |
| Layouts | Raíz, Admin y shell `(panel)` | Compartir composición/metadata; agregar experiencia auth sin confiar exclusivamente en layout para proteger datos. |
| Server Components | Entradas de rutas/layouts y sección local | Lecturas privadas/públicas con proyecciones mínimas; no serializar hashes, costos privados o credenciales hacia Client Components. |
| Client Components | Filtros, formularios visuales, shell, gráficos y PDP visual | Interacción y estados; reciben únicamente lo autorizado. No importar clientes de BD o secretos. |
| Server Actions | No hay comandos de negocio | Alternativa para mutaciones ligadas a formularios de la app. Deben validar, autorizar y llamar al dominio/transacción; no basta que se ejecuten en servidor. |
| Route Handlers | No hay endpoints de negocio | Alternativa si se necesita contrato HTTP explícito, integración de auth/correo/archivos o cliente específico. No crear una API REST completa por defecto. |
| Redirecciones | Login usa navegación cliente; logout es Link | Decisiones auth servidor y destinos internos seguros; mantener contexto sin filtrar información. |
| Caché / revalidación | SSG/fixtures; no política comercial | Evitar que cambios de visibilidad/stock/precio queden obsoletos; invalidación tras commit y límites explícitos. Consultas privadas no deben ir a caché pública compartida. |
| Validación perimetral de auth | No existe proxy/middleware de la app | Puede ayudar a redirigir; no reemplaza validación junto a consultas/comandos. La forma depende de librería y versión elegidas. |

Cargas y errores son convenciones disponibles en App Router; deben escogerse según cada lectura y segmento. Referencias: [Next loading](https://nextjs.org/docs/app/api-reference/file-conventions/loading) y [Next error](https://nextjs.org/docs/app/api-reference/file-conventions/error). No se crean archivos de esas convenciones en esta tarea.

## 14. Formularios y validación

**Inventario actual:** un formulario de login de demostración con usuario de tipo texto y contraseña, `required`, labels y reset. Las búsquedas/selects administrativos son controles locales, no formularios de operaciones. No existen formularios de producto, proveedor, compra, venta, egreso, recuperación, mínimo o configuración.

En todos los formularios futuros: validación cliente para orientar; validación servidor como autoridad; mensajes por campo y generales; submitting y prevención visual de duplicación; éxito solo tras confirmación persistida; retorno seguro ante fallo; referencias/estado revalidados durante la operación. Librería ⚪ pendiente. Referencia de criterio: [OWASP Input Validation](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html).

| Formulario futuro | Datos conocidos / candidatos y vacíos | Cliente | Servidor | Éxito y errores específicos |
| --- | --- | --- | --- | --- |
| Login | Email + contraseña deseados; hoy usuario libre. Política exacta pendiente | Campos y formato acordados, no alterar silenciosamente contraseña | Identidad, credencial, estado, intentos, sesión | Sesión creada y redirección; error neutro, indisponibilidad o límite de intentos. |
| Recuperación/restablecimiento* | Email; token; nueva contraseña y confirmación como UX candidata | Campos, coincidencia si se adopta | Respuesta neutra, token válido/único, política de contraseña | Solicitud neutra/reset confirmado; expirado/usado/inválido y fallo recuperable. |
| Producto | Información pública, visibilidad; precio/imagen y categorías candidatos del mock; campos exactos PENDIENTES | Campos aprobados, selección/previsualización si corresponde | Estructura, existencia, identidad/slug y coherencia del cambio | Guardado real; colisión, imagen fallida, edición concurrente o no encontrado. |
| Proveedor | Identificación/datos de contacto candidatos; obligatoriedad PENDIENTE | Campos aprobados | Formato, referencias y unicidad solo donde se defina | Guardado y consulta; datos inválidos, no encontrado o conflicto. |
| Mínimo de stock | Mínimo opcional; unidades, límites y forma de quitarlo PENDIENTES | Diferenciar ausente de cero | Cantidad válida; no usar umbral inventado | Cambio persistido, actualización de alerta; conflicto o valor inválido. |
| Compra | Producto/cantidad/importe histórico; proveedor/fecha según validación; estructura de líneas candidata | Ayudar a editar/revisar líneas y totales, no fijar reglas no aprobadas | Referencias, cantidades/importes, estado y transacción con stock | Referencia de compra confirmada; reintento/duplicación o fallo sin efecto parcial. |
| Venta | Producto/cantidad/precio histórico; comprador opcional | Disponibilidad orientativa, Consumidor Final sin dato obligatorio | Stock actual, permisos, precio/cantidad y transacción | Referencia; stock insuficiente/cambiado y guardado fallido sin efectos parciales. |
| Egreso manual | Importe; concepto/fecha candidatos; clasificación y límites PENDIENTES | Campos aprobados, presentación de importe | Origen manual, importe/estado y autorización | Referencia; error de validación, duplicación o fallo de guardado. |
| Anulación | Identidad de operación; motivo/fecha no son campos obligatorios sin fuente | Confirmar consecuencia y mantener contexto | Estado y reversión única; saldo suficiente para compra | Anulación aplicada; ya anulada, conflicto o negativo al revertir compra. |
| Filtro de reportes | Período/fecha aplicable/moneda PENDIENTES | Formato y opciones aprobados | Rango, límites y mismo criterio de fechas en todos los agregados | Resultado o vacío; no confundir consulta fallida con cero. |
| Configuración | Ningún campo validado | N/A hoy | N/A hoy salvo protección de ruta | No inventar «Guardar cambios» sin una operación aprobada. |

`*` Recuperación condicionada a aprobación. La carga inicial de stock también requiere un procedimiento y reglas antes de formularios; no se introduce automáticamente «ajuste manual». No imponer importe positivo, decimales, largo de texto, unicidad de nombre o proveedor obligatorio por intuición: validar fuentes y luego reflejar las restricciones exactas.

## 15. Catálogo conceptual de errores

Nombres orientativos en español sin tildes, no códigos ni API formal. El servidor identifica situación; la interfaz decide cómo presentarla sin filtrar secretos. Reintentos y respuestas idempotentes se definirán en contratos posteriores.

| Situación conceptual | Módulo | Efecto que debe impedirse / tratamiento esperado |
| --- | --- | --- |
| `STOCK_INSUFICIENTE` | Venta | No registrar/descontar parcialmente; explicar falta y permitir revisar líneas. |
| `STOCK_NEGATIVO_AL_ANULAR_COMPRA` | Compra | Mantener compra y saldo intactos; informar que no se puede revertir. |
| `COMPRA_YA_ANULADA`, `VENTA_YA_ANULADA`, `EGRESO_YA_ANULADO` | Operaciones | No aplicar otra reversión/efecto; devolver resultado vigente coherente, no éxito ficticio adicional. |
| `OPERACION_NO_ENCONTRADA`, `PRODUCTO_NO_ENCONTRADO`, `PROVEEDOR_NO_ENCONTRADO` | Consulta/comandos | No continuar con referencias inexistentes; conservar contexto. La semántica pública de ocultos está pendiente. |
| `DATOS_INVALIDOS` | Formularios | Errores por campo con valores no sensibles conservados; ninguna escritura parcial. |
| `REFERENCIA_INVALIDA`, `ESTADO_NO_PERMITE_OPERACION` | Dominio | Rechazar operación incompatible; transiciones exactas pendientes de fuentes. |
| `CONFLICTO_DE_ACTUALIZACION` | Producto/stock/operaciones | Datos cambiaron; revisar el estado nuevo sin sobrescribir silenciosamente. |
| `SOLICITUD_REPETIDA` / resultado incierto | Confirmaciones | No duplicar operación; recuperar resultado o indicar cómo resolver incertidumbre. |
| `CREDENCIALES_INVALIDAS` | Auth | Mensaje neutro y sin sesión; no confirmar existencia de cuenta. |
| `SESION_REQUERIDA`, `SESION_EXPIRADA`, `ACCESO_DENEGADO` | Privado | Sin datos ni escrituras; login o denegación según contexto. |
| `DEMASIADOS_INTENTOS` | Auth/recuperación* | Limitar abuso y ofrecer recuperación razonable; política pendiente. |
| `TOKEN_INVALIDO_O_VENCIDO`* | Recuperación | No cambiar credencial; permitir solicitar otro enlace. No publicar token o email interno. |
| `SERVICIO_NO_DISPONIBLE`, `ERROR_INESPERADO` | BD/infra/servidor | Error seguro con referencia; no respuesta de lista vacía ni falso éxito. |
| `IMAGEN_NO_VALIDA`, `ALMACENAMIENTO_NO_DISPONIBLE` | Imágenes | Validar recurso y conservar referencia anterior si falla sustitución. |

El error de envío de correo, si se aprueba recuperación, se registra de forma protegida; la respuesta pública debe seguir siendo neutra. Los errores de conexión/contención no son errores de dominio ni deberían mostrarse como SQL o stack trace.

## 16. Seguridad: checklist pendiente y prioridad

Referencia de requisitos: [SEGURIDAD.md](SEGURIDAD.md). Hoy existen exclusiones Git de secretos, links externos con `noopener noreferrer`, contenido React y marcas noindex; son controles parciales, no seguridad de la administración. No se inspeccionaron secretos locales ni se certifica ausencia de vulnerabilidades por lectura estática.

| Control | Estado actual | Necesario para MVP operativo / criterio pendiente |
| --- | --- | --- |
| Autenticación y autorización servidor | ❌ | Necesario antes de datos reales; cada lectura/comando administrativo y acceso directo protegido. |
| Sesiones persistentes, expiración absoluta y revocación | ❌ NO IMPLEMENTADO | Máximo absoluto de 30 días desde login, sin extensión por uso diario; otras sesiones del cambio autenticado pendientes solo para ese subflujo. |
| Cookies y HTTPS | ❌ sesión; HTTPS productivo no configurado | Necesario para auth real; atributos/ámbito según solución y entorno. El servidor LAN HTTP no acredita despliegue seguro. |
| Contraseñas | ❌ | Hash/mecanismo seguro de solución madura; provisión y cambio seguros, sin credenciales de muestra en producción. |
| Protección frente a CSRF | ❌ operaciones reales | Necesario según mecanismo elegido; evaluar controles de origen/tokens y comportamiento del framework. SameSite por sí solo no sustituye el análisis; no mutar mediante GET. |
| Intentos y abuso | ❌ | Rate limiting de login y endpoints sensibles; recuperación si se aprueba; política de errores y límites acordada. |
| Entradas y acceso a datos | ❌ negocio | Validación servidor, consultas seguras y autorización de referencias; cliente/TypeScript no bastan. |
| Salida/sanitización | 🟡 contenido fijo | Escape por contexto; sanitizar solo donde se admita contenido activo. `chart.tsx` genera estilos desde configuración fija; no habilitar HTML/CSS de usuario sin análisis. |
| Archivos y URLs | ❌ carga | Si se admite gestión de imágenes, formatos reales/límites/autorización y referencias seguras; no aceptar URL arbitraria hacia red interna. |
| Errores y secretos | 🟡 `.gitignore` y revisión previa | Configurar secretos fuera de Git/cliente, mínima exposición, errores seguros y logs redactados. Crear ejemplo de variables solo cuando se definan sus nombres. |
| Caché y datos privados | ❌ datos reales | No almacenar respuestas administrativas en caché pública ni exponer privados en payload público/RSC. |
| Headers relevantes | ⚪ política; sin configuración propia | Revisar contra clickjacking, MIME sniffing, referrer y política de contenido; HSTS solo con HTTPS correcto. No afirmar que no hay headers predeterminados del framework. |
| Dependencias/entorno | 🟡 versiones fijadas | Revisar avisos de seguridad y compatibilidad antes de producción, gestión de actualizaciones y permisos mínimos de BD. No se hizo un análisis de CVE en esta auditoría. |
| Recuperación por email | 🔴 propuesta | Si se aprueba como MVP: controles de sección 7 y pruebas; si no, alternativa operativa validada. |
| Backups y recuperación | ❌ integración/operación | Respaldo/restauración verificables para datos reales; retención y responsables acordados, sin inventar RPO/RTO. |

CSRF depende de credenciales, cookies y mecanismo de mutación; se debe comprobar la protección concreta al elegir la solución. Referencia: [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).

**Mejoras futuras, no requisitos añadidos:** múltiples roles, MFA obligatorio, login social, gestión de dispositivos por UI, SIEM, auditoría regulatoria y automatizaciones complejas. Su posible utilidad no las convierte en alcance. Analytics/Meta Pixel y banner de cookies no se agregan por asociación con auth; mantener la decisión documentada de no incorporarlos sin evaluación específica.

## 17. Testing: qué debe probarse, sin elegir framework

**Actual:** scripts lint/typecheck/build, ESLint y comprobaciones manuales registradas en [MIGRACION_UI](MIGRACION_UI.md). ❌ No hay suite unitaria/de integración/E2E funcional ni testing de dominio; el éxito del build no prueba stock, auth o transacciones.

| Tipo | Pruebas críticas pendientes | Criterio de evidencia |
| --- | --- | --- |
| UNITARIO / dominio | Fórmula del resultado, cantidades según definición, elegibilidad pública, mínimo ausente y umbral validado, transiciones y efectos de anulación | Casos normales y límites; ninguna regla se basa en un texto de fixture. |
| INTEGRACIÓN / venta | Descuenta stock y guarda historia; insuficiente sin efecto; oculto con stock vendible; comprador opcional | Contra persistencia elegida; verificar estado antes/después. |
| INTEGRACIÓN / compra | Incrementa saldo, conserva importes, fallo intermedio revierte todo | Compra, detalles y saldo coherentes, sin egreso duplicado. |
| INTEGRACIÓN / anulaciones | Venta reintegra una vez; compra revierte una vez y se bloquea si negativo; egreso conserva historial y deja de contar | Repetir y ejecutar en paralelo; cero efectos parciales. |
| INTEGRACIÓN / concurrencia | Dos ventas de la última unidad; anulación de compra con venta concurrente; dos anulaciones del mismo registro | No negatividad y reversión única sin depender del orden del navegador. |
| INTEGRACIÓN / reportes | Mezcla de vigentes/anulados, fechas de borde, período vacío/cero/negativo, moneda/redondeo aprobados | Reconciliar fuentes históricas y resumen; sin doble conteo. |
| INTEGRACIÓN / auth | Credenciales, revocación, persistencia, máximo absoluto de 30 días aun con actividad diaria, cookie manipulada, cuenta inhabilitada | Rutas/consultas/comandos rechazan accesos sin permiso; sin fuga de privados. |
| INTEGRACIÓN / recuperación* | Respuesta neutra, token expirado/usado/concurrente, reemisión, fallo de correo y revocación acordada | Ningún reset sin prueba válida; consumo único; sin exponer secretos. |
| INTEGRACIÓN / imágenes | Sustitución fallida, referencia inválida, formato/tamaño, limpieza segura | Producto conserva imagen anterior si falla; no quedan referencias rotas. |
| E2E | Login persistente → alta producto → compra → venta → consultas → anular → reporte → logout; elegir los pasos aprobados | Recorrido con datos de prueba reproducibles y comprobación persistida. |
| E2E / público | Catálogo/PDP tras publicar/ocultar/agotar, slug inexistente, filtros/vacíos/error, contactos | Sin autenticación del visitante; contenido privado no descargado. |
| E2E / negativo | Acceso directo Admin, sesión expirada al guardar, doble clic/reintento y entradas inválidas | Ninguna mutación indebidamente aplicada; mensajes recuperables. |
| MANUAL | Responsive, teclado/lector, foco, tablas, formularios, diálogos, imágenes y enlaces externos | Matriz de estados y dispositivos acordados; capturas son evidencia auxiliar. |
| MANUAL / operación | Restauración de backup, configuración de entorno, falla de BD/correo y rollback de release | Procedimiento documentado ejecutable por el responsable, sin usar datos reales en pruebas inseguras. |

La ejecución técnica del cierre de UI es evidencia histórica de esa UI, no cobertura del MVP. La elección de herramientas, entorno de pruebas, limpieza de datos y CI necesita tarea/ADR. No se exige 100% de cobertura ni se escribe test que solo replique implementación.

## 18. Observabilidad y operación antes de producción

**Actual:** salida de herramientas y evidencia de QA excluida en `work/`; ❌ no instrumentación funcional, error tracking ni operación productiva definida.

| Nivel | Necesidad | Validación para cierre |
| --- | --- | --- |
| Mínimo operativo | Logs servidor consistentes con identificador de solicitud/operación, resultado y momento, sin payload sensible | Poder seguir fallo y resultado de compra/venta sin reconstruirlo desde capturas. |
| Mínimo operativo | Eventos de auth fallidos, expiración/revocación y denegación según política | Investigar abuso sin loguear contraseñas, cookies, tokens o email completo innecesario. |
| Mínimo operativo | Fallos de BD, transacción y concurrencia, con respuesta segura | Distinguir rechazo de dominio, rollback y resultado incierto; no devolver stack/SQL al navegador. |
| Mínimo operativo | Fallos de correo si se aprueba recuperación y de almacenamiento si se aprueban cargas | Diagnóstico sin token de recuperación o URL firmada expuestos. |
| Mínimo operativo | Retención/acceso a logs, respaldo y procedimiento de recuperación | Definir responsables/entorno y comprobar restauración. Cifras exactas pendientes. |
| Mínimo operativo | Detección y aviso de fallos críticos por un mecanismo acordado | Que una caída no dependa exclusivamente de que la propietaria mire la consola. No exige proveedor ni APM completo. |
| Mejora futura | Error tracking externo, trazas distribuidas, dashboards, alertas sofisticadas o auditoría visual | ADR cuando se justifique; monolito pequeño no necesita infraestructura distribuida por defecto. |

Logs diagnósticos no sustituyen la historia persistida de operaciones y anulaciones. Minimizar datos y proteger acceso/retención forma parte del diseño. Referencia: [OWASP Logging](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html). No se elige proveedor ni se instala seguimiento.

## 19. Accesibilidad

La revisión manual de UI Foundation comprobó navegación y responsive básicos, según MIGRACION_UI. El código contiene labels de login, `aria-current`, nombres de controles, skip link administrativo, foco visible, alt, semántica de tablas, Radix Dialog/Sheet y carrusel con teclado/`aria-live`. No hay certificación formal ni prueba nueva con lector de pantalla en esta auditoría.

| Área | Ya observado | Pendiente antes de cerrar MVP |
| --- | --- | --- |
| Teclado/navegación móvil | Menús, drawer, links y navegación revisados previamente | Repetir sobre formularios reales, rutas nuevas aprobadas y estados de sesión. |
| Labels y formularios | Login con Label; buscadores/selects con nombre | Nuevos campos con asociación de ayuda/error, requeridos/agrupaciones y orden lógico. |
| Foco | Estilos visibles y skip link; primitivas de diálogo | Foco al fallar/guardar, retorno al trigger, confirmación de anulación y redirección tras sesión expirada. |
| Mensajes y estados dinámicos | Carrusel anuncia posición; placeholder gráfico con status | Errores de campo/resumen, submitting, éxito, conflicto y resultados vacíos anunciados sin depender solo de color. |
| Contraste/zoom | Paleta aprobada, sin medición formal registrada | Medir texto, iconos, foco, estados disabled/error, zoom y texto largo; no inventar cumplimiento WCAG. |
| Diálogos | Título/descripción y cierre del detalle mock; Sheet accesible por primitivas | Probar teclado/lector, cierre y conservación de entradas de negocio; no asumir que librería garantiza todo el flujo. |
| Tablas/gráficos | Encabezados/labels, scroll horizontal interno; gráfico con nombre | Contexto de acciones por fila, lectura de cifras y alternativa textual; consistencia entre gráfico y tabla real. |
| Imágenes | Alt informativo o vacío decorativo; crédito del local | Alt de productos reales, error de recurso y composición responsive; no copiar nombres incorrectos del mock. |

Las nuevas pruebas de accesibilidad deben integrarse a los criterios de cada slice. No se fija un nivel de conformidad formal no acordado, aunque la accesibilidad básica ya es objetivo de CALIDAD.

## 20. Performance

**Estado:** 🟡 PARCIAL como base UI; 🔴 métricas no funcionales sin definir. No se ejecuta benchmark, Lighthouse, prueba de carga o análisis de bundle en esta auditoría. No inventar umbrales de velocidad, volumen, disponibilidad o cantidad de productos.

| Punto | Evidencia actual | Qué verificar al implementar |
| --- | --- | --- |
| Imágenes | Siete archivos suman 7.436.641 bytes en disco; tres PNG de producto y uno del local concentran el peso | Peso transferido real por viewport, tamaños derivados, formatos y estabilidad visual. Ese total de disco no equivale al peso inicial de una página. |
| Optimización | `next/image` con `sizes`/priority en lugares concretos; `unoptimized: true` global | Elegir estrategia compatible con almacenamiento/hosting y medir resultado; usar el componente no garantiza optimización de entrega. |
| Catálogo | Siete fixtures enviados/filtrados localmente | Consulta/proyección pública acotada; medir con volumen representativo. Paginación o búsqueda servidor si se justifica, no por suposición. |
| Consultas | No hay BD | Evitar lecturas repetidas/N+1 y consultas sin límite; índices y planes cuando exista modelo validado, sin diseñarlos ahora. |
| Gráficos/bundle | Recharts y controles cliente; montaje tras hidratación | Coste de JS/hidratación, carga donde se usa, alternativa textual; no trasladar toda consulta al cliente por estar el gráfico en cliente. |
| Fuentes | DM Sans/Playfair con next/font; descarga en build | Build reproducible en entorno destino, formatos/pesos realmente usados y comportamiento en carga. |
| Caché | SSG de fixtures | Política real de frescura/invalidación tras stock, precios y visibilidad; privado no compartido. No escoger tiempo arbitrario. |
| Operaciones | No existen llamadas de negocio | Medir duración y errores/reintentos con concurrencia representativa; no confundir bloqueo por stock con lentitud. |

`unoptimized` evita el tratamiento automático de optimización del componente; la decisión futura debe evaluarse con el despliegue, no cambiarse como parte de esta auditoría. Referencia: [Next Image](https://nextjs.org/docs/app/api-reference/components/image).

## 21. SEO e indexabilidad pública

**Estado general:** 🟡 PARCIAL. Existe HTML inicial y metadata básica sobre fixtures; no se ha comprobado indexación real en un dominio productivo. Un servidor de desarrollo/LAN o un build exitoso no acreditan indexación.

| Aspecto | Actual | Mínimo pendiente para el público definitivo |
| --- | --- | --- |
| Acceso sin autenticación | ✅ rutas públicas independientes | Mantenerlo al agregar guard administrativo; no exigir cookie para leer catálogo/PDP. |
| HTML de producto | ✅ composición inicial y PDP prerenderizada de fixture | Datos públicos reales en HTML y validación de respuesta/estado ante BD/stock/visibilidad. |
| Metadata | 🟡 título/descripción raíz, catálogo y PDP; Admin noindex | Textos definitivos coherentes con contenido real; no indexar información privada. |
| Slug y canonical | 🟡 URL descriptiva `/catalogo/[slug]`; sin `metadataBase` ni `alternates.canonical` propios | Resolver dominio público y política de URL/canonical al desplegar. Ruta llamada «canónica» en migración no significa etiqueta canonical implementada. |
| Robots | 🟡 metadata noindex de Admin; sin `robots.ts`/robots.txt propios | Verificar reglas globales en entorno final, sin bloquear accidentalmente público; robots/noindex no sustituyen auth. |
| Sitemap | ❌ no existe sitemap propio | Evaluar/generar listado de URLs públicas elegibles y actualizadas; no incluir ocultos, Admin o URL de recuperación. |
| Despublicados/no disponibles | 🔴 política no definida | Resolver comportamiento de ficha directa, respuesta, enlazado e invalidación con producto; no decidir silenciosamente 404/410/redirección. |
| Imágenes/semántica | 🟡 alt, encabezados y estructura actuales | Verificar contenido final, enlaces y errores de imágenes sin depender solo de JS. |
| Indexación operativa | ❌ no deployment | Dominio/HTTPS, configuración de entorno y comprobación de rastreo de páginas públicas, sin prometer resultados de posicionamiento. |

Metadata, robots y sitemap son mecanismos distintos. Referencias: [Next Metadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata), [robots](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots) y [sitemap](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap). La documentación técnica no obliga por sí misma a una optimización comercial concreta.

**Optimizaciones futuras:** schema enriquecido, campañas, Search Console como herramienta operativa, estrategias de keywords o métricas de conversión. No son funcionalidades añadidas al MVP por esta auditoría. La decisión de no incorporar Analytics/Pixel sigue vigente.

## 22. Evolución del manejo de imágenes

**Actual:** siete assets locales, sin carga ni administración de archivos. Tres imágenes de producto demostrativas; tres historias reales; una edición de Street View del acceso con atribución. El hero reutiliza un placeholder de producto. La imagen del local no acredita estado actual del negocio. Ver [FOTO_LOCAL](features/FOTO_LOCAL.md).

| Necesidad a evaluar | Concepto y pendiente |
| --- | --- |
| Producto e información pública | Imagen/referencia y texto alternativo; número de imágenes, obligatoriedad y formatos necesitan fuente. No asumir galería múltiple. |
| Incorporación/actualización | Definir si la propietaria necesita subir archivos en MVP o si habrá procedimiento controlado de provisión; no crear CMS automáticamente. Si es parte de producto, coordinar formulario, guardado y almacenamiento. |
| URL/identidad | Referencia estable y origen controlado; evitar rutas del PC, dependencias de staging o URLs arbitrarias introducidas sin validación. |
| Sustitución | Mantener imagen anterior hasta confirmar la nueva referencia; evitar caché equivocada o enlace roto si falla la operación. |
| Eliminación/limpieza | Retirar solo cuando no haya referencias necesarias; política de recursos huérfanos y relación con historia pendiente. No equivale a habilitar borrar productos o registros históricos. |
| Almacenamiento | ⚪ ADR pendiente: evaluar persistencia de archivos según hosting, respaldo, permisos y operación. No elegir proveedor ni asumir que escribir en `public/` funciona en el hosting futuro. |
| Seguridad | Si hay uploads: autorizar, verificar formato/contenido y límites, nombres/rutas seguras y acceso. No confiar solo en extensión o validación del navegador. |
| Rendimiento y privacidad | Tamaños de entrega, optimización y caché; evaluar metadatos innecesarios y permisos de uso del contenido. No modificar los assets en esta tarea. |

Referencia de controles de carga, condicionados al diseño que se apruebe: [OWASP File Upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html). Reemplazar imágenes ficticias por contenido comercial confirmado es distinto de implementar un sistema completo de administración de medios.

## 23. Reportes: pasar de fórmula mock a resultado real

La operación aritmética actual de E05 ya reproduce visualmente **ventas − compras − egresos**, pero sus operandos son series estáticas. No consulta registros, estados, períodos reales o anulaciones. No es una consulta económica implementada por el hecho de mostrar un número.

Para cerrar esta capacidad:

1. Validar período, fecha aplicable, moneda, redondeo y estado de operación relevante. Hoy son 🔴 pendientes.
2. Registrar compras/ventas/egresos con importes históricos y estado, sin borrar anulados.
3. Consultar en servidor solo operaciones vigentes de los tres orígenes, con el mismo criterio de fechas.
4. Restar compras **una vez**; no volver a incluirlas en egresos manuales. No cambiar el cálculo a costo vendido, margen o ganancia contable.
5. Usar lectura consistente y misma definición para resumen, detalle y gráficos que se aprueben; un selector debe aplicar a lo que la UI dice que representa.
6. Mostrar período sin operaciones como vacío/resultado cero según UX acordada; distinguir resultado negativo válido de error técnico.
7. Probar importes/estados/fechas mixtos, anulaciones repetidas y consistencia después de transacciones.

El gráfico circular de exploración, agrupaciones semanales, métricas nuevas y exportaciones son candidatos o fuera de definición actual. No se agregan balances, impuestos, contabilidad completa, margen financiero o paneles no solicitados. Los datos mock no fijan moneda ni límites temporales para el MVP.

## 24. Auditoría específica de `/admin/configuracion`

| Elemento observado/candidato | Clasificación | Consecuencia |
| --- | --- | --- |
| Ruta, título y navegación | REAL como UI | ✅ navegación disponible; no demuestra un módulo de configuración funcional. |
| Aviso DATOS DE DEMOSTRACIÓN | REAL informativo | Explica correctamente que no se guarda ni autentica. |
| Icono Settings y estado «Pendiente» | Decorativo/informativo | No tiene acción de negocio ni dato persistido. |
| «Prototipo pendiente de definición» | REAL como vacío de UI | No hay inputs, controles de preferencias o botón Guardar. |
| Nombre/avatar «Administradora» del shell | MOCK, ni siquiera dato de esta página | Debe provenir de identidad real si se mantiene; no implica gestión de perfiles. |
| Cambio de contraseña/datos de cuenta | Candidato de auth | Definir en tarea de identidad si es necesario; no asumir implementación aquí. |
| Horarios/contactos del negocio editables | Candidato de producto | Hoy en código; CMS fuera del alcance. No convertirlos en panel por asociación. |
| Temas, permisos múltiples, sucursales, impuestos | Sin requisito / algunos fuera del MVP | No implementar como obligación de cerrar esta página. |

La decisión de cierre puede ser mantener una reserva explícita, no exponerla en la navegación definitiva o incorporar una capacidad puntual validada en su módulo. **No hace falta inventar un CRUD de Configuración para declarar terminado el MVP.** Sí hay que tomar una decisión consciente de UX final y proteger cualquier ruta administrativa que permanezca.

## 25. Dependencias entre módulos

Diagrama conceptual de precedencias de implementación, sin imponer el orden de todos los casos de uso:

```text
FUENTES VALIDADAS + ADR / DEFINICIONES PENDIENTES
  ├─ persistencia reproducible + estrategia de pruebas / CI mínimo
  └─ política de cuenta/sesiones
             ↓
       AUTH → acceso ADMIN protegido
             ↓
PRODUCTOS → INVENTARIO / STOCK → COMPRAS y VENTAS
PROVEEDORES → COMPRAS
COMPRAS y VENTAS + sus anulaciones → efectos atómicos en STOCK
VENTAS: comprador opcional; sin módulo de clientes obligatorio

PRODUCTOS + VISIBILIDAD + STOCK → CATÁLOGO + PDP PÚBLICOS
COMPRAS + VENTAS + EGRESOS MANUALES → REPORTES / RESUMEN

Transversales: validación servidor, permisos, estados UX, pruebas,
historia, errores, imágenes, caché, observabilidad y accesibilidad.
Recuperación por email: rama de AUTH solo si se aprueba.
Configuración: sin capacidad obligatoria definida; no es prerrequisito general.
```

La dependencia del público en productos/stock no significa que todo el catálogo deba esperar al último formulario: puede trabajarse una lectura real mínima en un slice. Proveedores/Compras y Ventas comparten Inventario; sus reglas no se duplican en pantallas ni en tres implementaciones distintas de stock.

## 26. Orden recomendado de implementación y condiciones de salida

Es una **propuesta de planificación**, no modificación de [PLAN_IMPLEMENTACION](PLAN_IMPLEMENTACION.md) ni autorización de trabajo. Concreta sus dependencias; no estima fechas, horas o porcentajes. Seguridad y pruebas acompañan cada slice, no se dejan íntegramente para el final.

| Paso | Trabajo futuro acotado | Bloqueos que debe resolver / salida verificable |
| --- | --- | --- |
| 0. Requisitos y decisiones | Incorporar SRS/RUP y cerrar vacíos prioritarios; tareas con RF/CU | Trazabilidad de gestión, disponibilidad/stock, estados, importes/fechas; decidir recuperación y configuración sin inventar alcance. |
| 1. Base de persistencia y calidad | ADR acceso a datos/validación/testing; recorrido mínimo reproducible hasta PostgreSQL | Conexión, migraciones y rollback probados; separación servidor/cliente y secretos; comandos de pruebas y CI mínimo acordados. No requiere CRUD genérico. |
| 2. Identidad y sesión | ADR auth, provisión única, login/logout y protección | Persistencia entre aperturas, expiración/revocación y permisos probados. Recuperación solo si se aprueba y con decisión de correo. |
| 3. Productos + inventario mínimo | Datos reales, gestión/visibilidad, mínimo y carga inicial aprobada | Estado persistido tras recarga; reglas de mínimo/no negatividad y referencias históricas. Manejo de imagen acordado. |
| 4. Público con datos reales | Catálogo/PDP/Home conectados a proyección autorizada | Publicados/disponibles, acceso directo y errores validados; contactos conservados; invalidación probada. Coordinar con paso 3. |
| 5. Proveedores + compras | Gestión requerida y compra/anulación transaccional | Aumento de stock, reversión única y bloqueo sin negativos; historial intacto y tests de fallo/concurrencia. |
| 6. Ventas | Registro/consulta/anulación internos | Stock insuficiente sin efecto, oculto vendible, comprador opcional, precios históricos y reintegro único. |
| 7. Egresos + reportes | Egreso manual/anulación y lectura de resultado real | Sin doble conteo, anulados fuera y período aprobado; conciliación con movimientos persistidos. |
| 8. Cierre funcional y operativo | Recorrer estados UX y criterios de cada módulo; completar contenido/SEO/accesibilidad | Tests de flujos y fallos, imágenes comerciales, horarios/identidad confirmados, revisión humana; resolver Configuración sin inflar alcance. |
| 9. Entorno y puesta en servicio | ADR hosting/operación, deployment autorizado, HTTPS, backups y diagnóstico | Configuración reproducible, secretos correctos, restauración/rollback y smoke del entorno final. LAN no equivale a despliegue. |
| 10. Aceptación del MVP | Recorrido de propietaria/visitante y trazabilidad final | Evidencia de todos los criterios, limitaciones aceptadas y responsable capaz de explicar operación. |

No convertir esta secuencia en diez PR gigantes: cada paso puede requerir slices acotados con criterio de terminado y pruebas. El próximo paso requiere una instrucción nueva; esta auditoría no lo inicia.

## 27. Decisiones bloqueantes y preguntas que deben resolverse

Actualización puntual del **19/10/2026** según [DECISIONES_PRODUCTO_MVP](DECISIONES_PRODUCTO_MVP.md). ❌ en una elección ya resuelta significa capacidad pendiente de implementar, no falta de aprobación de producto. La alineación con SRS/RUP sigue abierta y no se asignan RF/CU.

| Tema | Estado | Qué falta y qué bloquea |
| --- | --- | --- |
| SRS/RUP, campos y RF/CU | 🔴 BLOQUEADO POR FUENTE/REQUISITO | Incorporar fuentes validadas y resolver contradicciones; impide declarar trazabilidad y aceptación formal definitivas. |
| Disponibilidad pública/ocultos | ❌ NO IMPLEMENTADO | A/C aprobados: listado publicado + stock > 0; PDP publicada agotada accesible con «Sin stock»; oculto con 404; venta interna permitida con stock; URL estable. Faltan implementación y políticas técnicas de SEO/caché. |
| Stock y mínimo | ❌ NO IMPLEMENTADO | B aprobado: `<=`, mínimo opcional y 0 real, enteros, ajustes explícitos con motivo/fecha/historia y sin negativos; saldo inicial sin compra ni efecto económico. Falta implementación y alineación con fuentes definitivas. |
| Operaciones e historia | ❌ NO IMPLEMENTADO | A–G aprueban campos mínimos, múltiples líneas, fechas real/carga, historia y corrección mediante anulación/recreación de confirmados. No autorizan anulaciones parciales; validaciones/estados no resueltos, categorías finales y baja de proveedor sin historial permanecen pendientes. |
| Moneda, precisión, redondeo y período | ❌ NO IMPLEMENTADO | H aprobado: ARS, hasta dos decimales rechazando mayor precisión, fórmula sin anulados, mes actual/otro mes/rango, fecha real. Límites restantes de valores/fechas y representación técnica pendientes. |
| Email/login/sesión y recuperación | ❌ NO IMPLEMENTADO | I/J/cierre 9: email único + contraseña, máximo absoluto de 30 días desde login no extensible por uso diario, cierre manual; recovery de 1 hora/un uso, neutral aun si falla entrega, revoca enlace y todas las sesiones previas sin auto-login. Better Auth/Resend y setup controlado diseñados en ADR-004. Reemisión según soporte real, soporte/operación y formalización pendientes; sin registro público, roles o multiadmin. |
| ORM/acceso a datos/migraciones | ⚪ DECISIÓN PENDIENTE | ADR; PostgreSQL aceptado no elige el acceso, pooling o concurrencia. |
| Auth, validación y testing | ⚪ | ADR/criterios antes de instalar; no elegir por aparecer en ejemplos externos. |
| Imágenes | ⚪ DECISIÓN PENDIENTE | L/A6 aprueban una imagen principal administrable, obligatoria al publicar, guardado oculto sin imagen y conservación de la anterior ante fallo. Solo almacenamiento/optimización y detalles de carga siguen pendientes de decisión técnica. |
| Cuenta / Configuración | ❌ NO IMPLEMENTADO | Producto 8/9: Cuenta en `/admin/cuenta` muestra nombre/email solo lectura, contraseña/logout; otras sesiones del cambio autenticado pendientes solo para ese subflujo. Configuración solo claro/oscuro persistente exclusivo de admin, R3, sin efectos públicos ni épico genérico. |
| Contenido comercial | 🔴 BLOQUEADO POR FUENTE/REQUISITO | M reconfirma dirección Entre Ríos 924, Instagram y WhatsApp; recursos actuales aceptados para MVP sin CMS. Horarios definitivos, logo y catálogo comercial completo siguen pendientes; mantener «Consultar horarios vigentes». Street View editado no se presenta como foto nueva. |
| Hosting, CI, observabilidad y operación | ⚪ | Entornos, HTTPS, migraciones, secretos, backups y diagnóstico; proveedor no elegido. |
| Calidad no funcional | 🔴 objetivos pendientes | Volumen, tiempos, disponibilidad y nivel formal de accesibilidad sin métricas aprobadas; no prometer cifras. |

Documentos existentes que conservan redacción histórica: PLAN_IMPLEMENTACION describe etapa 0 «para revisión», el índice de ADR/ADR-002 alude a revisión pendiente y GIT_WORKFLOW describe main como documental. Git y MIGRACION_UI acreditan que UI Foundation ya se integró. Se registra la desalineación aquí; no se reescriben esos documentos ni se cambian decisiones en esta auditoría.

## 28. Cuándo considerar terminado el MVP

La [DEFINICION_TERMINADO](DEFINICION_TERMINADO.md) sigue siendo la referencia de aceptación. Esta lista la concreta como **criterios de revisión propuestos**; no sustituye SRS/RUP ni impone un proveedor, librería, métrica o funcionalidad adicional.

- [ ] SRS/RUP validados incorporados; cada capacidad y tarea trazada sin RF/CU inventados; decisiones pendientes que afecten comportamiento resueltas por humanos.
- [ ] PostgreSQL y acceso a datos reproducibles, migraciones y pruebas de rollback; datos conservados tras recarga/reinicio, no fixtures como fuente operativa.
- [ ] Cuenta inicial segura; login/logout, sesión con máximo absoluto de 30 días desde login sin extensión por actividad, revocación y autorización servidor verificados en páginas, consultas y comandos.
- [ ] Recuperación por email implementada y probada **solo si se aprueba para MVP**; si no, decisión y procedimiento de recuperación acordados. Sin SMS o multiadmin añadidos.
- [ ] Productos/proveedores gestionables según alcance validado; visibilidad y stock/mínimo correctos, identidad estable e historia conservada.
- [ ] Compras/ventas/egresos registrables, consultables y anulables; atomicidad, no negatividad, importes históricos y efectos únicos probados también ante reintentos/concurrencia.
- [ ] Catálogo/PDP/Home públicos con datos comerciales autorizados, disponibilidad real y política aprobada de ocultos/sin stock; ningún dato privado se filtra al navegador público.
- [ ] Resultado económico aproximado real con fórmula confirmada, período/moneda/redondeo aprobados, sin anulados ni doble conteo. Sin convertirlo en contabilidad completa.
- [ ] Formularios y estados UX aplicables de la matriz cerrados: carga, vacío, errores, validación, submitting, éxito, inexistencia, accesos, conflicto y sesión expirada; N/A justificados.
- [ ] Decisión sobre Configuración y candidatos visuales explícita; ninguna pantalla decorativa se presenta como operación funcional.
- [ ] Pruebas unitarias/de dominio, integración/concurrencia y E2E críticas pasan con evidencia reproducible; lint/typecheck/build se mantienen; CI mínimo y revisión humana según flujo acordado.
- [ ] Responsive, teclado/foco/errores accesibles y contenido comercial revisados con datos reales; fotografías/horarios/identidad y enlaces comprobados.
- [ ] Público accesible/indexable en entorno autorizado, metadata y política de URLs/robots/sitemap verificadas; Admin protegido y fuera de indexación, sin confundir noindex con seguridad.
- [ ] Entorno productivo aprobado, HTTPS, secretos y permisos mínimos; backups/restauración, logs seguros, detección de fallos y rollback operables; sin despliegue implícito desde esta tarea.
- [ ] Revisión humana de aceptación realizada y responsable capaz de explicar implementación, operación, restricciones y recuperación. No basta una declaración del agente.

### Condición actual de cierre

✅ UI Foundation está integrada en main. ❌ MVP operativo completo todavía no. **trazabilidad definitiva pendiente de incorporación de SRS/RUP validados**.

La siguiente tarea sugerida es validar fuentes y decisiones prioritarias y preparar un slice mínimo de persistencia/auth con sus criterios, sin comenzarlo automáticamente. Esta auditoría entrega únicamente el mapa.

### Mantenimiento de esta referencia

Cada futura integración deberá actualizar el estado del módulo, evidencia de código/pruebas, fuentes y decisiones que cambien; conservar distinción entre mocks, propuestas y capacidades reales. PR y revisión cruzada son opcionales según el workflow vigente; checks técnicos y ownership se mantienen. No cerrar una casilla por agregar un botón ni dar por aprobada una decisión por aparecer aquí. El mapa se evalúa contra el commit auditado; si cambia main, revisar su vigencia.

### Referencias técnicas externas consultadas

Consultadas el 16/10/2026 como apoyo conceptual: Next.js (auth, loading, error, metadata, robots, sitemap e imágenes) y OWASP (sesiones, contraseñas, autenticación, recuperación, CSRF, validación, logging y uploads), enlazadas junto a las secciones correspondientes. **No son las fuentes de verdad del producto ni decisiones de librerías.** Los ejemplos de documentación vigente pueden corresponder a versiones distintas de Next 16.0.10; una tarea de implementación deberá contrastarlos con la versión instalada.

## 29. Matriz ejecutiva global

Ampliación documental solicitada el **17/10/2026**. Se conservan las secciones 0–28 de la auditoría original, incluido su registro metodológico del 16/10/2026. La solicitud de cierre autoriza versionar el documento en una rama documental y abrir un PR sin mergearlo; no cambia el estado funcional de la aplicación ni acepta decisiones técnicas o requisitos pendientes.

La tabla resume el estado actual sobre el mismo commit auditado. Solo utiliza los seis estados de la sección 2. **UI implementada no significa operación de negocio implementada.** Persistencia significa acceso a datos de negocio persistidos, no existencia de archivos en Git. Validación parcial puede ser solo HTML o comprobación de un fixture; no acredita validación completa del servidor. Tests parcial refiere a la revisión manual previa de UI, no a una suite funcional. Documentación parcial distingue el mapa y documentos técnicos existentes de la trazabilidad formal pendiente.

La ausencia de una capacidad no implica que deba agregarse en todas las filas: por ejemplo, Home estática y contactos no necesitan escritura en BD, y el público no debe requerir autenticación. Las columnas indican qué existe, mientras las secciones 4–28 definen qué aplica y qué requiere validación. Producto 8/9: Configuración sigue visual, solo tema admin-only futuro; Cuenta/Auth separado y recovery incluido por J, no implementados. Formalización SRS/RUP pendiente.

**Punto previo a Inventario:** “Validar contra SRS/reglas definitivas si el administrador puede realizar ajustes manuales de stock y bajo qué restricciones.” El 19/10 el responsable aprobó explícitamente B3/B4: ajustes de incremento/decremento con cantidad, motivo obligatorio, fecha automática, historial y sin negativos; saldo inicial identificado sin compra ficticia ni efecto económico. Se resolvió la elección de producto, no por inferencia; sigue pendiente su alineación con SRS/reglas definitivas antes de implementar.

| Área | Ruta / feature | UI | Persistencia | Lógica de negocio | Validación | Auth/autorización | Loading | Empty | Errors | Tests | Documentación | Estado general |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Público | Home `/` | ✅ IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | 🟡 PARCIAL | 🟡 PARCIAL | 🟡 PARCIAL | 🟡 PARCIAL |
| Público | Catálogo `/catalogo` | ✅ IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | 🟡 PARCIAL | 🟡 PARCIAL | 🟣 UI/MOCK |
| Público | PDP `/catalogo/[slug]` | ✅ IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | 🟡 PARCIAL | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | 🟡 PARCIAL | 🟡 PARCIAL | 🟡 PARCIAL | 🟣 UI/MOCK |
| Auth | Login `/admin/login` | ✅ IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | 🟡 PARCIAL | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | 🟡 PARCIAL | 🟡 PARCIAL | 🟣 UI/MOCK |
| Auth | Sesiones y logout real | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | 🟡 PARCIAL | ❌ NO IMPLEMENTADO |
| Auth | Recuperación de cuenta aprobada en producto; rutas propuestas de sección 7 | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | 🟡 PARCIAL | ❌ NO IMPLEMENTADO |
| Admin | Productos `/admin/productos` | ✅ IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | 🟡 PARCIAL | ❌ NO IMPLEMENTADO | 🟡 PARCIAL | 🟡 PARCIAL | 🟣 UI/MOCK |
| Admin | Stock `/admin/stock` | ✅ IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | 🟡 PARCIAL | ❌ NO IMPLEMENTADO | 🟡 PARCIAL | 🟡 PARCIAL | 🟣 UI/MOCK |
| Admin | Proveedores `/admin/proveedores` | ✅ IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | 🟡 PARCIAL | ❌ NO IMPLEMENTADO | 🟡 PARCIAL | 🟡 PARCIAL | 🟣 UI/MOCK |
| Admin | Compras `/admin/compras` | ✅ IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | 🟡 PARCIAL | ❌ NO IMPLEMENTADO | 🟡 PARCIAL | 🟡 PARCIAL | 🟣 UI/MOCK |
| Admin | Ventas `/admin/ventas` | ✅ IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | 🟡 PARCIAL | ❌ NO IMPLEMENTADO | 🟡 PARCIAL | 🟡 PARCIAL | 🟣 UI/MOCK |
| Admin | Egresos `/admin/egresos` | ✅ IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | 🟡 PARCIAL | ❌ NO IMPLEMENTADO | 🟡 PARCIAL | 🟡 PARCIAL | 🟣 UI/MOCK |
| Admin | Reportes `/admin/reportes` y Resumen `/admin` | ✅ IMPLEMENTADO | ❌ NO IMPLEMENTADO | 🟣 UI/MOCK | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | 🟡 PARCIAL | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | 🟡 PARCIAL | 🟡 PARCIAL | 🟣 UI/MOCK |
| Admin | Configuración `/admin/configuracion` | 🟣 UI/MOCK | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ❌ NO IMPLEMENTADO | ✅ IMPLEMENTADO | ❌ NO IMPLEMENTADO | 🟡 PARCIAL | 🟡 PARCIAL | 🟣 UI/MOCK |

La matriz tiene **14 filas de áreas/features**, sin contar encabezado y separador. Empty parcial en listados es únicamente «sin coincidencias» de la muestra local. Loading parcial de reportes es el montaje del gráfico, no una consulta remota. La lógica de reportes es la resta visual sobre series mock; no se presenta como cumplimiento de las reglas de operaciones reales. Empty implementado de Configuración es el mensaje explicativo de reserva, no evidencia de un módulo funcional.

## 30. Backlog de alto nivel

Los siguientes **13 épicos** agrupan trabajo futuro; sus identificadores son de planificación, no RF/CU, tickets de implementación ni decisiones aceptadas. No se asignan integrantes, fechas, estimaciones, proveedores o librerías. Las dependencias describen capacidades de salida; calidad y seguridad acompañan todos los épicos. Se mantiene la trazabilidad definitiva pendiente de incorporación de SRS/RUP validados.

### EPIC-01 Fuentes y trazabilidad

- **Objetivo:** contar con una definición verificable del MVP sin convertir mocks o propuestas en requisitos.
- **Dependencias:** acceso humano a SRS corregida y artefactos RUP validados; jerarquía de AGENTS.md.
- **Tareas principales:** incorporar/contrastar fuentes y relacionar capacidades con RF/CU reales; alinear decisiones A–M aprobadas el 19/10 y resolver vacíos que permanecen. Ajustes B, recuperación J y cuenta K ya tienen decisión explícita de producto; falta formalización con SRS/RUP, no repetir su inclusión como pregunta sin resolver ni inventar funciones.
- **Criterio general de terminado:** fuentes incorporadas y contradicciones resueltas por el equipo; trazabilidad y criterios de aceptación disponibles para cada capacidad que se vaya a implementar; propuestas y exclusiones explícitas.

### EPIC-02 Persistencia

- **Objetivo:** disponer de una base reproducible de acceso a PostgreSQL que preserve integridad e historia.
- **Dependencias:** EPIC-01 para entidades/reglas aplicables; ADR aceptados de arquitectura y futura decisión humana sobre acceso a datos/migraciones.
- **Tareas principales:** evaluar/documentar acceso a datos sin elegirlo en esta auditoría; concretar modelo desde fuentes; planificar conexión segura, migraciones, datos iniciales, transacciones, concurrencia, fallos y recuperación. Coordinar pruebas y operación con EPIC-12/13.
- **Criterio general de terminado:** recorrido mínimo persistente reproducible, migraciones y rollback probados, acceso exclusivamente servidor y secretos fuera del código; contratos suficientes para los módulos sin adelantar CRUD ajeno al slice aprobado.

### EPIC-03 Autenticación y sesiones

- **Objetivo:** convertir login/logout mock en acceso administrativo real con sesión persistente razonable y autorización servidor.
- **Dependencias:** EPIC-01 para cuenta/políticas y EPIC-02 según la solución; ADR de auth y estrategia de sesión pendientes de validación humana.
- **Tareas principales:** implementar en tarea futura I/J/cierre 9 con ADR-004: provisión única segura, email + contraseña, sesión de máximo absoluto de 30 días desde login sin extensión por uso diario, cierre manual y autorización servidor. Recovery de 1 hora/un uso con respuesta neutra aun ante fallo de entrega, nueva contraseña, invalida enlace y todas las sesiones previas, sin auto-login. Cuenta en `/admin/cuenta` con identidad solo lectura/contraseña/logout; Configuración únicamente tema admin-only, R3. Resolver reemisión según soporte nativo y otras sesiones del cambio autenticado (solo bloquea ese subflujo), alinear SRS/RUP; sin reelegir herramientas aprobadas.
- **Criterio general de terminado:** identidad/sesión/autorización, persistencia, logout y expiración verificados; recuperación aprobada implementada con revocación global y pruebas negativas. Capacidad de cuenta K cubierta con sus pendientes resueltos; sin SMS, registro público, roles o multiadmin añadidos.

### EPIC-04 Productos

- **Objetivo:** gestionar información y visibilidad de productos persistidos conforme al alcance validado.
- **Dependencias:** EPIC-01/02/03; definición de campos, identidad/slug y manejo de imágenes.
- **Tareas principales:** consulta y operaciones de gestión aprobadas; publicación/ocultación reversible; validación servidor y errores; preservar referencias históricas. Coordinar imágenes y proyección pública con EPIC-06 y estados/pruebas con EPIC-12. No introducir eliminación física como requisito automático.
- **Criterio general de terminado:** operaciones aprobadas persisten tras recarga, visibilidad se respeta donde corresponde y cambios actuales no alteran historia; permisos, errores y pruebas cubiertos.

### EPIC-05 Inventario

**Punto previo a implementar este módulo:** “Validar contra SRS/reglas definitivas si el administrador puede realizar ajustes manuales de stock y bajo qué restricciones.” B3/B4 aprobados el 19/10 resuelven ajustes explícitos trazables y saldo inicial; resta alineación/formalización con fuentes definitivas, no permiso para edición libre ni reemplazo silencioso del saldo.

- **Objetivo:** consultar y conservar existencias válidas y mínimos opcionales con reglas compartidas por las operaciones.
- **Dependencias:** EPIC-01/02/03/04; B aprobado en producto y alineación con fuentes definitivas; reglas técnicas de integridad aún pendientes.
- **Tareas principales:** consulta de saldo/mínimo opcional y alerta `<=` excluyendo mínimo ausente; unidades enteras, saldo inicial identificado sin efecto económico y ajustes explícitos con cantidad, motivo obligatorio, fecha automática e historial según B. Contratos de efectos/reversiones con Compras/Ventas, atomicidad, concurrencia y no negatividad; sin reemplazos silenciosos.
- **Criterio general de terminado:** stock persistido nunca negativo, mínimo opcional tratado correctamente y umbral aprobado probado; efectos de operaciones coherentes bajo concurrencia y decisión de ajustes manuales documentada, sin inferencias.

### EPIC-06 Catálogo público

- **Objetivo:** pasar de fichas mock a Home, catálogo y PDP con datos comerciales públicos autorizados.
- **Dependencias:** EPIC-01/04/05 y acceso a datos de EPIC-02; decisiones sobre disponibilidad, URLs, imágenes y frescura de datos.
- **Tareas principales:** proyección pública de productos publicados/disponibles; política validada para acceso directo de ocultos/sin stock; contenido real, filtros/estados aplicables, metadata y revalidación. Conservar contactos/local/historias aprobados; no incluir checkout, cuentas de clientes o CMS. Coordinar indexabilidad y entorno con EPIC-12/13.
- **Criterio general de terminado:** catálogo/PDP/Home muestran datos reales elegibles sin exponer privados, el visitante no necesita sesión y los cambios de stock/visibilidad se reflejan según política probada; errores e indexabilidad del alcance verificados.

### EPIC-07 Proveedores

- **Objetivo:** disponer de la información y gestión de proveedores requerida por el negocio y las compras.
- **Dependencias:** EPIC-01/02/03; campos, relaciones y operaciones precisados por fuentes.
- **Tareas principales:** concretar datos mínimos y operaciones aprobadas de consulta/gestión, validación y permisos; conservar referencias históricas y coordinar selección en compras. No añadir datos fiscales/bancarios, baja o reglas de unicidad no confirmadas.
- **Criterio general de terminado:** gestión requerida persistente y consultable, referencias utilizables en compras sin romper registros anteriores, estados UX y pruebas aplicables aprobados.

### EPIC-08 Compras

- **Objetivo:** registrar, consultar y anular compras con historia, efecto único e incremento/reversión consistente de stock.
- **Dependencias:** EPIC-01/02/03/04/05/07, según relaciones de proveedor validadas; importes, fechas y estados definidos.
- **Tareas principales:** registro con líneas/referencias aprobadas; validación servidor y transacción de compra/detalles/stock; consultas históricas; anulación única bloqueada si genera stock negativo; tratamiento de reintentos y fallos. Evitar doble conteo de compras como egresos.
- **Criterio general de terminado:** registro y anulación atómicos, importes históricos intactos, stock/reportes coherentes, insuficiente para reversión sin cambios parciales y pruebas de concurrencia/repetición aprobadas.

### EPIC-09 Ventas

- **Objetivo:** registrar, consultar y anular ventas internas con control de stock y precios históricos.
- **Dependencias:** EPIC-01/02/03/04/05; importes, cantidades, fechas y estados validados.
- **Tareas principales:** registro/consulta con comprador opcional y Consumidor Final; comprobar/descontar stock actual en transacción; permitir venta interna de oculto con stock; anular con reintegro único, conservar historia y manejar resultado incierto/reintento.
- **Criterio general de terminado:** ventas insuficientes no aplican efectos, confirmaciones/anulaciones actualizan stock exactamente una vez, precios pasados no se reescriben y las pruebas de permisos, rollback y concurrencia pasan.

### EPIC-10 Egresos

- **Objetivo:** registrar, consultar y anular egresos manuales sin duplicar compras ni perder historia.
- **Dependencias:** EPIC-01/02/03; campos, importes, fechas y estados aprobados; coordinación de orígenes con EPIC-08/11.
- **Tareas principales:** operaciones manuales persistentes, validación/autorización, historial de anulados y efecto único; separación explícita entre compra y egreso manual en escritura y consulta. No agregar clasificación contable no solicitada.
- **Criterio general de terminado:** operaciones consultables tras recarga, anulaciones conservadas y excluidas del resultado, sin doble conteo o duplicación ante reintentos; errores y pruebas cubiertos.

### EPIC-11 Reportes

- **Objetivo:** obtener el resultado económico aproximado real y coherente con las operaciones vigentes.
- **Dependencias:** EPIC-01/02/03/08/09/10; período, fecha aplicable, moneda y redondeo validados.
- **Tareas principales:** consultas servidor y agregados consistentes; aplicar ventas vigentes − compras vigentes − egresos manuales vigentes; reconciliar resumen/detalle y gráficos aprobados, excluir anulados y evitar doble conteo. Distinguir período vacío/cero/negativo de error técnico. Mantener el circular como candidato sin métrica aprobada.
- **Criterio general de terminado:** resultado reproducible desde registros históricos con parámetros aprobados y misma definición entre vistas; pruebas de fechas, estados y agregados pasan; sin contabilidad completa o métricas añadidas.

### EPIC-12 Calidad y estados UX

- **Objetivo:** cerrar calidad verificable y estados aplicables en cada capacidad del MVP, de forma transversal.
- **Dependencias:** EPIC-01 y decisiones humanas de validación/testing; acompaña los demás épicos, no espera a que todos terminen.
- **Tareas principales:** completar matrices UX y catálogo de errores; validación cliente/servidor, accesibilidad, responsive y rendimiento según objetivos acordados; pruebas de dominio/integración/concurrencia/E2E y mantenimiento de lint/typecheck/build; CI mínimo coordinado con EPIC-13. Resolver la presencia final de Configuración y otros candidatos visuales sin convertirlos en un épico funcional ni crear requisitos.
- **Criterio general de terminado:** criterios/estados aplicables cubiertos con evidencia reproducible, pruebas críticas aprobadas y revisión humana; ausencia o no aplicación justificadas sin presentar mocks como funciones reales.

### EPIC-13 Operación y deployment

- **Objetivo:** preparar una puesta en servicio reproducible y recuperable en el entorno que se apruebe.
- **Dependencias:** decisiones humanas de hosting/operación; EPIC-02/03/12 y capacidades funcionales requeridas para aceptación final. La preparación de entorno puede coordinarse antes, sin habilitar datos reales inseguros.
- **Tareas principales:** definir entornos, secretos, HTTPS, permisos, migraciones de release, CI mínimo, backups/restauración, logs seguros, diagnóstico y rollback. Decidir almacenamiento/entrega de imágenes y correo únicamente si el flujo aprobado lo necesita; verificar indexabilidad pública y protección administrativa. Ningún deployment se ejecuta en esta tarea.
- **Criterio general de terminado:** entorno autorizado comprobado con datos/configuración adecuados, controles y CI acordados, recuperación/rollback probados y procedimiento operable por el responsable; MVP aceptado contra criterios validados, sin confundir servidor LAN con producción.

El backlog no autoriza comenzar ninguno de estos épicos. Actualización del 19/10: recuperación por email permanece dentro de Auth como capacidad aprobada por responsable y no implementada, pendiente de alineación con SRS/RUP; Configuración queda limitada a cuenta y no se convierte en épico de gestión. Esta actualización sigue siendo exclusivamente documental.

## 31. Mapa vigente tras arquitectura global

**19/10/2026**, tarea de preparación global aprobada expresamente. Los PR #2/#3 ya están integrados; la evidencia de aplicación sigue siendo UI Foundation. Aquí se actualiza planificación, sin reescribir el análisis del template ni marcar negocio como implementado. «Cuenta en Configuración», exclusión de destacado y herramientas pendientes de secciones anteriores quedaron sustituidos por decisiones/ADR actuales, solo en los puntos explícitos.

| Área funcional / destino | Estado real | Diseño/owner y siguiente trabajo |
| --- | --- | --- |
| Auth / Cuenta | ✅ IMPLEMENTADO y probado en local (26/10/2026): login, sesión de 30 días, guardia en las 10 páginas del panel, logout, `/admin/cuenta`, cambio de contraseña y recuperación por correo. Pendiente de operación: clave y dominio de Resend, hosting, alta en producción | Emi R1, Better Auth/Resend/Drizzle. Cuenta separada de Configuración; provisión controlada, sin signup público. Evidencia en `openspec/changes/implement-admin-auth-account/design.md` y `docs/DESARROLLO.md`. |
| Productos | 🟣 UI/MOCK | Augusto R1, Producto único/categorías/imagen/slug/visibilidad/destacado; no borrar historia. |
| Stock | 🟣 UI/MOCK | Claudio R1, saldo/mínimo `<=`/ajustes/historia/contrato transaccional; no saldo duplicado en Producto. |
| Proveedores | 🟣 UI/MOCK | Claudio R1, datos mínimos/inactivación; baja sin historia pendiente. |
| Compras | 🟣 UI/MOCK | Claudio R1, múltiples líneas/costos históricos/tx/reversión única sin negativos. |
| Ventas | 🟣 UI/MOCK | R2 sin owner, diseño completo en blueprint; sin change activo. |
| Finanzas — Egresos | 🟣 UI/MOCK en ruta actual `/admin/egresos` | R2; agrupar navegación bajo Finanzas, conservar historia y no duplicar compras. |
| Finanzas — Resultado económico | 🟣 UI/MOCK en `/admin/reportes` y Resumen | R2; fórmula/fechas reales y lectura consistente, sin Reportes paralelo ni tabla de resultado. |
| Experiencia pública | 🟡 PARCIAL en contenido/contactos; 🟣 UI/MOCK en catálogo | Augusto R1; Home/destacados/categorías/PDP con proyección real, conservar identidad y contactos. |
| SEO | 🟡 PARCIAL | Augusto R1; metadata/OG/canonical/JSON-LD/sitemap/robots veraces, sin datos comerciales inventados. |
| Configuración admin | 🟣 UI/MOCK de reserva; ❌ NO IMPLEMENTADO en preferencia | R3 sin owner, solo claro/oscuro persistente por cuenta y exclusivo de admin; no Cuenta/CMS. |
| Dashboard | 🟣 UI/MOCK | R2 sin owner, operativo y derivado de módulos reales, sin widgets/analytics avanzados. |

Diseño y herramientas aprobados no cambian las columnas de persistencia/auth/lógica/tests de la matriz histórica a ✅. Falta implementar y probar. El modelo, ownership de schemas, protocolos de migración y tres changes de R1 están en el blueprint/OpenSpec; no hay más changes activos ni responsables R2/R3.

### Decisiones técnicas cerradas / pendientes reales

Drizzle, Better Auth, Resend, Zod, Vitest/RTL/Playwright aprobados; Cloudinary elegido por ADR-007 y estrategias de modelo/dinero/transacciones/Next en ADR-003/008. Por tanto, los ⚪ históricos de esas elecciones **quedan resueltos como diseño**, manteniendo ❌ su implementación. No instalar esas dependencias por ejecutar OpenSpec.

Siguen pendientes SRS/RUP canónicos/RF-CU formales, políticas comerciales no respondidas, otras sesiones tras cambio autenticado (único bloqueo de ese subflujo), reemisión de recovery según soporte nativo, baja proveedor sin historia, horarios/contenido final, dominio/hosting/DB administrada, cuentas/secretos de servicios, observabilidad final y CI/CD avanzado. Sesión absoluta de 30 días y recovery de 1 hora ya aprobados; nombre/email solo lectura, edición fuera del alcance autorizado. [DECISIONES_PENDIENTES](DECISIONES_PENDIENTES.md) es el registro vigente; [TRAZABILIDAD_MVP](TRAZABILIDAD_MVP.md) contiene RF-01..21 **aportados por el responsable como referencia**, sin afirmar texto canónico disponible ni inventar IDs.

### Contradicciones revisadas y resueltas

| Fuente anterior | Resolución explícita actual |
| --- | --- |
| ALCANCE/UX excluían destacado administrable | Flag booleano aprobado, sin ranking/campañas; formalización académica pendiente. |
| K1 situaba Cuenta en Configuración y excluía tema | Cuenta/Auth separada; Configuración solo apariencia admin-only persistente. |
| Template separa Egresos/Reportes y usa gráficos | Finanzas agrupa Egresos/Resultado; dashboard operativo. UI actual no cambia en esta tarea. |
| ARQUITECTURA/TESTING/ADR-002/pendientes no elegían herramientas | ADR-003..008 y documentos vigentes registran aprobación; MIGRACION_UI/features anteriores siguen como historia fechada del bootstrap. |
| PLAN/DESARROLLO no asignaban integrantes | Solo R1 asignada expresamente en nueva tarea; R2/R3 mantienen owners sin definir. |
| Mocks usan categorías/datos/saldos independientes | No autoridad de requisitos. Un solo Producto/Categoria/Inventario diseñados; no migrar fixtures como productos reales. |

No se modifican fuentes académicas externas ausentes. No se ejecuta ningún change, no tablas ni migraciones, no auth/CRUD/SEO real. Esta preparación termina tras validación y merge autorizado.
