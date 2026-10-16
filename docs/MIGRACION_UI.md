# Auditoría previa y migración de UI

## Punto de partida

Repo limpio en main, 61585ab; remoto origin https://github.com/0Otsu/angel-tears.git. Rama de trabajo feature/ui-foundation. La autorización humana de UI FOUNDATION + APPLICATION BOOTSTRAP acepta Next.js full-stack, TypeScript, monolito modular y PostgreSQL futuro; no autoriza auth, BD, ORM, CRUD o deploy. Staging es referencia de solo lectura.

## Versiones e inconsistencias revisadas ANTES de instalar

Se inspeccionaron package.json, lockfile, paquetes instalados y cierre transitivo de imports locales de staging. El manifiesto declara rangos; los instalados son Next 16.0.10, React/React DOM 19.2.0, TypeScript 5.9.3, Tailwind y @tailwindcss/postcss 4.3.3, PostCSS 8.5.30, Lucide 0.454.0 y Recharts 2.15.4. Se fijan esas versiones exactas. Tailwind del manifiesto era ^4.1.9, pero no es la versión efectivamente instalada. No se actualizó el stack por novedad.

shadcn/ui son fuentes locales, no un runtime único versionado: se migrará solo el cierre de componentes UI utilizados (13 archivos). Radix 1.x/2.x, clsx 2.1.1, class-variance-authority 0.7.1, tailwind-merge 3.7.0 y tw-animate-css 1.3.3 mantienen sus versiones instaladas. No hay import de Motion en las rutas aprobadas: no se agrega.

React DOM requiere ^19.2.0 y Recharts acepta React 19. Lucide declara ^19.0.0-rc, rango semver que también admite 19.2.0 estable; no requiere override ni desactivar peers. La resolución previa fija node-releases 2.0.58 por compatibilidad con la política de antigüedad de pnpm; se conserva explícitamente, sin copiar el store.

Staging tenía lint declarado pero sin ESLint; se añade ESLint 9.39.5 y eslint-config-next 16.0.10, emparejado con Next. Su peer requiere ESLint >=9. Necesidad: lint solicitado para repo real; alternativa descartada: conservar el script roto. Impacto: solo desarrollo, sin framework de testing. Se usa flat config oficial: https://nextjs.org/docs/app/api-reference/config/eslint . No se desactivan reglas para aceptar código heredado.

Se elimina ignoreBuildErrors de Next: el build real debe comprobar tipos. Se retira Analytics no aprobado. pnpm 11.25.0 y Node 24.15.0 son los usados localmente; packageManager y .nvmrc los documentan. Desarrollo usa webpack por el error reproducido de next/font en Turbopack dev del prototipo; build conserva el compilador predeterminado. No se elige herramienta de auth, validación o persistencia.

## Selección consciente

Solo rutas públicas canónicas y admin, siete componentes Boty montados, componentes admin y sus imports UI, seis imágenes usadas y mocks. No migrar /shop, /product, cart, checkout, cuentas, informes de staging, work, screenshots, componentes muertos, cosméticos, analytics, Zod ni dependencias sin import alcanzable.

## Verificación

Los resultados finales, diferencias y pendientes se completan al cerrar esta tarea. Evidencia local en work/ui-foundation, excluida de Git. La revisión humana y la trazabilidad RF/CU siguen pendientes.

La primera instalación de pnpm 11 bloqueó scripts de sharp 0.34.5 (dependencia nativa de Next) y unrs-resolver 1.12.2 (resolución de ESLint). Se aprobarán exclusivamente esos paquetes conocidos con pnpm approve-builds sharp unrs-resolver, sin permitir todos los scripts ni desactivar strictDepBuilds. El gestor informa deprecación de Recharts 2 y ESLint 9; se conservan por compatibilidad de esta entrega, documentando la actualización como tarea posterior.

## Inventario final reproducible

[Inventario completo](migracion-ui-inventario.json): fuentes de referencia utilizadas, archivos no copiados y dependencias excluidas. Se migraron siete composiciones Boty, diez componentes administrativos y trece fuentes UI compartidas, con seis imágenes alcanzables. No hay paquetes de Motion, formularios RHF, Zod como dependencia directa, cart, checkout, cuentas ni hooks muertos.

| Paquete | Versión exacta | Uso |
| --- | --- | --- |
| `@radix-ui/react-accordion` | 1.2.2 | runtime |
| `@radix-ui/react-dialog` | 1.1.4 | runtime |
| `@radix-ui/react-dropdown-menu` | 2.1.4 | runtime |
| `@radix-ui/react-label` | 2.1.1 | runtime |
| `@radix-ui/react-select` | 2.1.4 | runtime |
| `@radix-ui/react-slot` | 1.1.1 | runtime |
| `@radix-ui/react-tabs` | 1.1.2 | runtime |
| `@radix-ui/react-tooltip` | 1.1.6 | runtime |
| `class-variance-authority` | 0.7.1 | runtime |
| `clsx` | 2.1.1 | runtime |
| `lucide-react` | 0.454.0 | runtime |
| `next` | 16.0.10 | runtime |
| `react` | 19.2.0 | runtime |
| `react-dom` | 19.2.0 | runtime |
| `recharts` | 2.15.4 | runtime |
| `tailwind-merge` | 3.7.0 | runtime |
| `@tailwindcss/postcss` | 4.3.3 | desarrollo |
| `postcss` | 8.5.30 | desarrollo |
| `tailwindcss` | 4.3.3 | desarrollo |
| `tw-animate-css` | 1.3.3 | desarrollo |
| `typescript` | 5.9.3 | desarrollo |
| `@types/node` | 22.20.5 | desarrollo |
| `@types/react` | 19.3.0 | desarrollo |
| `@types/react-dom` | 19.3.0 | desarrollo |
| `eslint` | 9.39.5 | desarrollo |
| `eslint-config-next` | 16.0.10 | desarrollo |

Dependencias directas de staging no migradas: `@hookform/resolvers`, `@radix-ui/react-alert-dialog`, `@radix-ui/react-aspect-ratio`, `@radix-ui/react-avatar`, `@radix-ui/react-checkbox`, `@radix-ui/react-collapsible`, `@radix-ui/react-context-menu`, `@radix-ui/react-hover-card`, `@radix-ui/react-menubar`, `@radix-ui/react-navigation-menu`, `@radix-ui/react-popover`, `@radix-ui/react-progress`, `@radix-ui/react-radio-group`, `@radix-ui/react-scroll-area`, `@radix-ui/react-separator`, `@radix-ui/react-slider`, `@radix-ui/react-switch`, `@radix-ui/react-toast`, `@radix-ui/react-toggle`, `@radix-ui/react-toggle-group`, `@vercel/analytics`, `autoprefixer`, `cmdk`, `date-fns`, `embla-carousel-react`, `input-otp`, `next-themes`, `react-day-picker`, `react-hook-form`, `react-resizable-panels`, `sonner`, `tailwindcss-animate`, `vaul`, `zod`. No se borraron de staging. ESLint incluye Zod 4.6.7 de forma transitiva a través de eslint-plugin-react-hooks; solo es una dependencia de la herramienta de desarrollo, no una elección de validación ni un import de la aplicación. ORM, auth y framework de testing no se instalaron.

## Mocks y limpieza técnica

Fixtures públicos y detalles de producto en lib/mock/productos.ts; administración en lib/mock/admin.ts; historias reales en lib/mock/historias-sociales.ts. Los nombres/precios/imágenes comunes de admin se toman del mismo fixture de productos. Los estados de inventario son datos visuales predefinidos; no implementan el umbral pendiente de stock ni disponibilidad real. La UI pública conserva los productos de demostración aprobados y no representa una consulta al inventario.

Se extrajo TarjetaProducto del catálogo sin cambiar sus clases. Se eliminaron las rutas legacy y sus enlaces. Las cuatro fichas que ya tenían copy conservaron ese texto; las otras tres piezas del catálogo usan sus propios datos de muestra y textos genéricos pendientes de confirmar, en lugar de mostrar Collar Aura por error. Un slug desconocido devuelve 404.

Se mantienen el login y logout exclusivamente de navegación: formulario requerido, reset y router.push, sin envío, credenciales guardadas, tokens o cookies. Todas las pantallas del panel usan el aviso DATOS DE DEMOSTRACIÓN. El gráfico circular sigue etiquetado candidato visual y fuera del resumen. La barrera client-only de Recharts usa useSyncExternalStore para conservar el montaje tras hidratación sin setState síncrono en un efecto ni desactivar reglas de lint.

## Validación realizada

Lint sin warnings, typecheck y build correctos en bootstrap, público, admin y corrección de metadata. El build comprueba TypeScript. pnpm install --frozen-lockfile pasó tras permitir los dos scripts nativos documentados. pnpm dev (webpack) se inició y respondió HTTP 200, además de pnpm start con build de producción.

Las 13 rutas pedidas se visitaron en navegador a 1440×900 y 390×844; se capturaron también las mismas rutas de staging: 52 capturas. Sin overflow horizontal de página, imágenes rotas, imports rotos, errores de hidratación o consola. Las tablas móviles conservan su scroll interno original. Comparación visual revisada para todas las rutas; la diferencia visible es el aviso mock explícito en Admin. Los tokens, fuentes, imágenes, spacing y composición permanecen.

Se probaron login → /admin, drawer que abre/navega/cierra, logout → /admin/login, filtro Anillos, navegación a PDP canónica, Cuidados y ancla El local. Se verificaron los destinos de Instagram/Maps. HTTP: 13 respuestas 200; /shop, /product/collar-aura y slug inexistente devuelven 404. Las respuestas no crean cookies; la PDP contiene su h1 en el HTML inicial. Títulos de Admin corregidos para evitar doble sufijo Angel Tears y distinguir pantallas.

Evidencia local excluida de Git: work/ui-foundation/rutas-navegador.json, http.json, flujos.json, comparacion.json, capturas y logs. Las capturas no se copian al runtime ni se versionan. No se configuró una suite de testing ni CI definitivo. El PR queda para revisión humana; esta verificación no sustituye SRS/RUP ni la Definition of Done.

## Diferencias y pendientes

Diferencias técnicas aceptadas: dependencias mínimas con versiones fijadas, fuentes de mocks centralizadas, SSR/SSG y metadata, URLs canónicas, 404 real, eliminación de Analytics y corrección de montaje de gráficos para lint. Sin rediseño. Home tiene idéntica presentación salvo variaciones mínimas del scroll indicator animado al capturar. Admin muestra la etiqueta de demostración pedida.

PostgreSQL está elegido y sin conexión. Siguen pendientes ORM, auth, validación, testing framework, almacenamiento de imágenes, hosting, error tracking, analytics y CI definitivo. También SRS/RUP, RF/CU, datos comerciales finales, WhatsApp/horarios, fotos del local y revisión humana. No se comenzó ninguna vertical slice ni se desplegó la aplicación. Los avisos de deprecación de Recharts 2/ESLint 9 y datos antiguos de baseline-browser-mapping quedan documentados; revisar mantenimiento de dependencias en una tarea propia antes de un despliegue real.
