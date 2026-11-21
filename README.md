# Angel Tears

Angel Tears reúne el catálogo público y la gestión diaria de una tienda de accesorios de Concordia, Entre Ríos. Los clientes pueden consultar productos por WhatsApp o Instagram y concretar la compra en el local. Desde el panel se gestionan productos, existencias y operaciones sin editar el sitio. El proyecto comenzó en Ingeniería de Software II y evolucionó hasta convertirse en la tienda comercial publicada.

[Tienda comercial](https://angeltears.com.ar/) · [Ver la demo académica](https://angel-tears-demo.vercel.app/) · [Arquitectura y decisiones](docs/ARQUITECTURA.md) · [Guía de despliegue comercial](docs/DESPLIEGUE_COMERCIAL.md)

## Funcionalidades

- **Sitio público.** Inicio, catálogo, fichas de producto con galería y consultas por WhatsApp e Instagram. Catálogo y fichas leen productos publicados y disponibilidad desde PostgreSQL.
- **Administración.** Inicio y cierre de sesión, cuenta y recuperación de contraseña. Productos con [categorías dinámicas](docs/features/CATEGORIAS_DINAMICAS.md), imágenes, visibilidad, destacados y archivado lógico. Carga inicial de stock en el alta, ajustes e historial de inventario. [Configuración del negocio](docs/features/CONFIGURACION_NEGOCIO.md) permite editar los datos públicos del local y los horarios por día.
- **Operaciones.** Gestión de proveedores y registro, consulta y anulación de compras, ventas y gastos. El resumen calcula el resultado aproximado a partir de las operaciones vigentes.

## Arquitectura y seguridad

El sistema es un monolito modular con Next.js App Router, React, TypeScript y Tailwind CSS. `app/` reúne las rutas, los Server Components, las Server Actions y los Route Handlers. `lib/modulos/` contiene los casos de uso y contratos por dominio, y `lib/infraestructura/` reúne la persistencia y los adaptadores externos.

- **Persistencia.** PostgreSQL guarda productos, inventario, operaciones, configuración y sesiones. Drizzle y `pg` conectan la aplicación con la base, y `drizzle/` contiene las migraciones versionadas. Los cambios de stock se coordinan con las operaciones mediante transacciones, restricciones e idempotencia cuando corresponde.
- **Acceso administrativo.** Better Auth gestiona sesiones persistidas y la recuperación de contraseña. El alta de la cuenta administradora es controlada y el registro público está deshabilitado. El servidor comprueba la sesión en rutas, acciones y endpoints privados. Resend entrega los enlaces de recuperación, con respuesta neutra y límites persistentes.
- **Imágenes y catálogo.** Cloudinary almacena las fotos y PostgreSQL conserva las referencias. El archivado retira el producto del catálogo y del listado administrativo habitual y preserva sus existencias e historial.
- **SEO técnico.** Incluye títulos, descripciones, URL canónicas, Open Graph, `robots.txt`, sitemap y datos estructurados `LocalBusiness` y `Product`. El dominio comercial está verificado en Google Search Console y el sitemap fue enviado. La demo y las rutas administrativas están fuera del alcance de indexación.

## Puesta en marcha local

1. Usá Node **24.15.0** (ver [`.nvmrc`](.nvmrc)), pnpm **11.25.0** e instalá con `pnpm install --frozen-lockfile`. El proyecto obtiene fuentes al compilar.
2. Arrancá tu PostgreSQL local. Para preparar una instancia nueva, seguí la [guía de bases locales](docs/DESARROLLO.md#base-de-datos-local-y-pruebas-de-integración). En una instancia existente, verificá primero el destino y el historial de migraciones.
3. Copiá [`.env.example`](.env.example) a `.env.local` y completá `DATABASE_URL`, `BETTER_AUTH_SECRET` y `BETTER_AUTH_URL`. El puerto de PostgreSQL debe coincidir con el que expone la instancia local. Si habilitás pruebas de integración, configurá una base local separada en `DATABASE_URL_TEST`.
4. Confirmá que `DATABASE_URL` apunta a tu base local de desarrollo. En una base nueva, aplicá las migraciones con `pnpm db:migrate` y seguí el [alta controlada de la administradora](docs/DESARROLLO.md#alta-de-la-administradora). Antes de guardar un producto, creá una categoría desde el formulario o prepará las [categorías iniciales](docs/DESARROLLO.md#base-de-datos-local-y-pruebas-de-integración).
5. Ejecutá `pnpm dev`. Abrí [Inicio](http://localhost:3000) o [el acceso administrativo](http://localhost:3000/admin/login).

[.env.example](.env.example) explica la configuración local. La [sección del entorno comercial](docs/DESPLIEGUE_COMERCIAL.md#instalación-comercial-actual) enumera las variables del despliegue. Guardá los valores reales en archivos ignorados o en el gestor de secretos del entorno.

## Validación

Vitest y Testing Library cubren reglas de dominio y componentes. Las pruebas de integración usan PostgreSQL aislado para verificar persistencia y transacciones. Playwright se reserva para recorridos completos.

- `pnpm lint`, `pnpm typecheck`, `pnpm build` validan código, tipos y compilación.
- `pnpm test` ejecuta pruebas unitarias y de componentes. Para acotar una corrida, usá `pnpm exec vitest run --project unitarias ruta/al/archivo.test.ts` o el proyecto `componentes`.
- `pnpm test:integration` aplica las migraciones a la base de pruebas y ejecuta pruebas contra PostgreSQL. El arnés puede escribir y limpiar datos de esa base.
- `pnpm test:e2e` usa Playwright y un servidor en el puerto 3100. Consultá [requisitos y alcance de cada comando](docs/DESARROLLO.md#pruebas) antes de ejecutarlo.

## Entornos

| Entorno | Datos y operación |
| --- | --- |
| Desarrollo y pruebas | Bases locales separadas. Para revisar la aplicación, usá un entorno local con todas las migraciones aplicadas. Usá cuentas de desarrollo separadas si necesitás probar Cloudinary o Resend. |
| Demo académica | Vercel, PostgreSQL y Cloudinary con datos de muestra. Su preparación y comandos protegidos están en [la guía de la demo](docs/features/DEMO_DEFENSA_2026.md). Sus actualizaciones se coordinan por separado. Antes de un push, verificá en Vercel el estado de la integración con GitHub. |
| Producción comercial | Netlify con Neon, Cloudinary y Resend comerciales. Usá la [guía operativa](docs/DESPLIEGUE_COMERCIAL.md#instalación-comercial-actual) para el despliegue manual y la recuperación. |

## Retomar el proyecto

Leé [AGENTS.md](AGENTS.md) y [Arquitectura](docs/ARQUITECTURA.md) para ubicar responsabilidades, luego seguí [Desarrollo](docs/DESARROLLO.md) y el [flujo Git](docs/GIT_WORKFLOW.md). Revisá el estado de la rama y preservá los commits locales antes de sincronizar. Las [decisiones aprobadas](docs/DECISIONES_PRODUCTO_MVP.md), los [ADR](docs/adr/README.md) y el [blueprint](docs/BLUEPRINT_IMPLEMENTACION_MVP.md) conservan el contexto de diseño. El [mapa de implementación](docs/MAPA_IMPLEMENTACION.md) y la [migración de UI](docs/MIGRACION_UI.md) registran el prototipo histórico. Los archivos de esa etapa pueden consultarse en los commits mencionados en esos documentos.

## Equipo y forma de trabajo

Augusto Vidoni ([0Otsu](https://github.com/0Otsu)) propuso Angel Tears como solución para un negocio real y coordinó el trabajo inicial. Participó en la definición del alcance, la distribución de responsabilidades y las decisiones técnicas. Implementó y evolucionó Productos, la experiencia pública y el SEO, y lideró la preparación técnica y la puesta en producción comercial.

Emi desarrolló Autenticación, Cuenta y Ventas. Claudio desarrolló Inventario, Proveedores y Compras. El equipo distribuyó el trabajo por módulos y coordinó los contratos compartidos y las migraciones al integrar las contribuciones. El [historial de commits](https://github.com/0Otsu/angel-tears/commits/main/) y el [flujo de trabajo](docs/GIT_WORKFLOW.md) registran esas contribuciones y decisiones.
