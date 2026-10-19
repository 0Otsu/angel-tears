# Angel Tears

Sitio público de accesorios en Concordia y base visual para la administración del negocio.

## Estado

**UI foundation / implementación inicial.** Sitio público navegable y panel administrativo visual con datos mock. Auth, base de datos, CRUD y persistencia **no están implementados**. No usar esta base para operar con información real.

## Stack

- Next.js 16.0.10, App Router: una aplicación para público y administración.
- React / React DOM 19.2.0.
- TypeScript 5.9.3.
- Tailwind CSS 4.3.3 y componentes visuales Boty/shadcn adaptados.
- PostgreSQL: decidido para persistencia futura, todavía no conectado.

Arquitectura complementaria aprobada, todavía sin integración: Drizzle, Better Auth, Resend, Zod, Vitest/React Testing Library/Playwright y Cloudinary. Ver [blueprint del MVP](docs/BLUEPRINT_IMPLEMENTACION_MVP.md) y [ADR](docs/adr/README.md). No instalar/implementar todo automáticamente al abrir el repositorio.

## Requisitos locales

Node **24.15.0** (ver `.nvmrc`) y pnpm **11.25.0** (`packageManager` en package.json). Instalar requiere acceso al registro de paquetes; next/font obtiene las fuentes durante la compilación. No se requieren credenciales ni variables de BD para esta etapa.

## Instalar

```sh
pnpm install --frozen-lockfile
```

## Desarrollo

```sh
pnpm dev
```

Abrir http://localhost:3000. Desarrollo usa webpack por compatibilidad del flujo de fuentes del prototipo en Windows; no cambia la UI. Para ejecutar el build local: `pnpm build` y `pnpm start`.

## Validación

```sh
pnpm lint
pnpm typecheck
pnpm build
```

El build comprueba tipos; no tiene ignoreBuildErrors. Testing está elegido pero no instalado: aún no existe `pnpm test`. CI definitivo sigue pendiente.

## Rutas públicas

- `/`
- `/catalogo`
- `/catalogo/collar-aura` (patrón `/catalogo/[slug]`)

Home incluye `/#el-local`, `/#de-ustedes` y `/#contacto`. Instagram, Maps y WhatsApp están activos; el teléfono confirmado es +54 9 3454 26-6760. El local muestra una imagen de Google Street View aportada por el usuario, editada para retirar controles, con atribución conservada y encuadre centrado en el acceso. No es una foto nueva del comercio. Imágenes y precios de catálogo son demostrativos. Las historias aportadas son reales; los horarios siguen pendientes de confirmar.

## Administración

- `/admin/login`
- `/admin`
- `/admin/productos`
- `/admin/stock`
- `/admin/proveedores`
- `/admin/compras`
- `/admin/ventas`
- `/admin/egresos`
- `/admin/reportes`
- `/admin/configuracion`

**El acceso administrativo todavía utiliza navegación mock y NO constituye autenticación.** Cualquier valor que cumpla los campos requeridos permite navegar de login a `/admin`; no se envía, guarda ni valida identidad. Cerrar sesión vuelve a `/admin/login`. Las rutas administrativas son accesibles directamente y muestran DATOS DE DEMOSTRACIÓN. No hay cookies, tokens ni localStorage de auth.

## Documentación

Consultar [docs/](docs/), [AGENTS.md](AGENTS.md), [arquitectura](docs/ARQUITECTURA.md), [ADR-002 aceptado](docs/adr/ADR-002-nextjs-fullstack.md), [desarrollo](docs/DESARROLLO.md), [migración y validación](docs/MIGRACION_UI.md) y [decisiones pendientes](docs/DECISIONES_PENDIENTES.md). SRS/RUP validados y trazabilidad RF/CU siguen pendientes; no se inventan identificadores.

Para planificar el trabajo: [mapa de implementación](docs/MAPA_IMPLEMENTACION.md) y [decisiones de producto del MVP](docs/DECISIONES_PRODUCTO_MVP.md).

Para Ronda 1: [blueprint y ownership](docs/BLUEPRINT_IMPLEMENTACION_MVP.md), [trazabilidad SRS/RUP](docs/TRAZABILIDAD_MVP.md) y [OpenSpec con Codex](docs/OPENSPEC.md). Emi: Auth/Cuenta; Claudio: Inventario/Proveedores/Compras; Augusto: Productos/Público/SEO. Solo tres changes activos, ninguno implementado. OpenSpec CLI global 1.14.3; seis skills del proyecto en `.agents/skills`, sin reemplazar AGENTS.

Antes de implementar una funcionalidad, revisar el mapa de implementación, las decisiones de producto y las fuentes de mayor prioridad definidas en AGENTS.md.
