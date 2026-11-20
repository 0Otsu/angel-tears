# Angel Tears

Catálogo y panel administrativo para una bijouterie física de Concordia, Entre Ríos. El sitio permite descubrir productos y consultar por WhatsApp e Instagram. Las compras se concretan en el local. El proyecto nació como trabajo de Ingeniería de Software II y continuó con una preparación comercial.

[Ver la demo académica](https://angel-tears-demo.vercel.app/) · [Arquitectura y decisiones](docs/ARQUITECTURA.md) · [Guía de despliegue comercial](docs/DESPLIEGUE_COMERCIAL.md)

El sistema es un monolito modular con Next.js App Router, React, TypeScript y Tailwind CSS. Usa PostgreSQL con Drizzle y `pg`, Better Auth para identidad y sesiones, Cloudinary para fotos de productos y Resend para recuperación por correo.

## Estado actual

- **Sitio público.** Inicio, catálogo, fichas de producto con galería y consultas por WhatsApp e Instagram. Catálogo y fichas leen productos publicados y disponibilidad desde PostgreSQL.
- **Administración.** Inicio y cierre de sesión, cuenta y recuperación de contraseña. Productos con [categorías dinámicas](docs/features/CATEGORIAS_DINAMICAS.md), imágenes, visibilidad y destacados. Carga inicial de stock en el alta, ajustes e historial de inventario. [Configuración del negocio](docs/features/CONFIGURACION_NEGOCIO.md) permite editar los datos públicos del local.
- **Operaciones.** Gestión de proveedores y registro, consulta y anulación de compras, ventas y gastos. El resumen calcula el resultado aproximado a partir de las operaciones vigentes.
- **Estado de entrega.** La demo usa datos separados y permanece fuera del índice. La instalación y la validación del entorno comercial siguen pendientes.

## Puesta en marcha local

1. Usá Node **24.15.0** (ver [`.nvmrc`](.nvmrc)), pnpm **11.25.0** e instalá con `pnpm install --frozen-lockfile`. El proyecto obtiene fuentes al compilar.
2. Arrancá tu PostgreSQL local. Para preparar una instancia nueva, seguí la [guía de bases locales](docs/DESARROLLO.md#base-de-datos-local-y-pruebas-de-integración). En una instancia existente, verificá primero el destino y el historial de migraciones.
3. Copiá [`.env.example`](.env.example) a `.env.local` y completá `DATABASE_URL`, `BETTER_AUTH_SECRET` y `BETTER_AUTH_URL`. El puerto de PostgreSQL debe coincidir con el que expone la instancia local. Si habilitás pruebas de integración, configurá una base local separada en `DATABASE_URL_TEST`.
4. Confirmá que `DATABASE_URL` apunta a tu base local de desarrollo. En una base nueva, aplicá las migraciones con `pnpm db:migrate` y seguí el [alta controlada de la administradora](docs/DESARROLLO.md#alta-de-la-administradora). El alta de productos necesita que las [categorías iniciales estén cargadas](docs/DESARROLLO.md#base-de-datos-local-y-pruebas-de-integración).
5. Ejecutá `pnpm dev`. Abrí [Inicio](http://localhost:3000) o [el acceso administrativo](http://localhost:3000/admin/login).

[.env.example](.env.example) explica la configuración local. La [tabla del entorno comercial](docs/DESPLIEGUE_COMERCIAL.md#variables-del-servicio) distingue las variables obligatorias y opcionales. Guardá los valores reales en archivos ignorados o en el gestor de secretos del entorno.

## Validación

- `pnpm lint`, `pnpm typecheck`, `pnpm build` validan código, tipos y compilación.
- `pnpm test` ejecuta pruebas unitarias y de componentes. Para acotar una corrida, usá `pnpm exec vitest run --project unitarias ruta/al/archivo.test.ts` o el proyecto `componentes`.
- `pnpm test:integration` aplica las migraciones a la base de pruebas y ejecuta pruebas contra PostgreSQL. El arnés puede escribir y limpiar datos de esa base.
- `pnpm test:e2e` usa Playwright y un servidor en el puerto 3100. Consultá [requisitos y alcance de cada comando](docs/DESARROLLO.md#pruebas) antes de ejecutarlo.

## Entornos

| Entorno | Datos y operación |
| --- | --- |
| Desarrollo y pruebas | Bases locales separadas. Para revisar la aplicación, usá un entorno local con todas las migraciones aplicadas. Usá cuentas de desarrollo separadas si necesitás probar Cloudinary o Resend. |
| Demo académica | Vercel, PostgreSQL y Cloudinary con datos de muestra. Su preparación y comandos protegidos están en [la guía de la demo](docs/features/DEMO_DEFENSA_2026.md). Un push a `origin/main` puede iniciar el despliegue automático. |
| Producción comercial | Entorno por validar. La [guía de despliegue comercial](docs/DESPLIEGUE_COMERCIAL.md) describe la preparación, la reunión con Sofía, las copias y el checklist de lanzamiento. |

## Retomar el proyecto

Leé [AGENTS.md](AGENTS.md) y [Arquitectura](docs/ARQUITECTURA.md) para ubicar responsabilidades, luego seguí [Desarrollo](docs/DESARROLLO.md) y el [flujo Git](docs/GIT_WORKFLOW.md). Revisá el estado de la rama y preservá los commits locales antes de sincronizar. Las [decisiones aprobadas](docs/DECISIONES_PRODUCTO_MVP.md), los [ADR](docs/adr/README.md) y el [blueprint](docs/BLUEPRINT_IMPLEMENTACION_MVP.md) conservan el contexto de diseño. El [mapa de implementación](docs/MAPA_IMPLEMENTACION.md) y la [migración de UI](docs/MIGRACION_UI.md) registran el prototipo histórico. Los archivos de esa etapa pueden consultarse en los commits mencionados en esos documentos.

## Equipo

Augusto inició y coordinó el proyecto, trabajó en Productos, sitio público y SEO y continuó la preparación comercial. Emi trabajó en Autenticación, Cuenta y Ventas. Claudio trabajó en Inventario, Proveedores y Compras. El historial conserva las contribuciones del equipo.
