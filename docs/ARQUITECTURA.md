# Arquitectura

Angel Tears es un **monolito modular** desplegable como una aplicación Next.js con PostgreSQL. Los módulos tienen responsabilidades y contratos explícitos. La [decisión de arquitectura](adr/ADR-001-monolito-modular.md), el [stack](adr/ADR-002-nextjs-fullstack.md) y el [blueprint](BLUEPRINT_IMPLEMENTACION_MVP.md) documentan el diseño aprobado.

## Capas y entradas

| Ruta de código | Responsabilidad |
| --- | --- |
| `app/` | App Router. Inicio y Catálogo son públicos. `app/admin/(panel)/` agrupa las pantallas protegidas. Los Route Handlers reciben autenticación y archivos de producto, y las Server Actions coordinan los formularios administrativos. |
| `components/` | Presentación e interacción. `admin/` aloja el panel, `publico/` aloja catálogo y fichas y `boty/` contiene la composición del sitio. `ui/` tiene componentes reutilizables. |
| `lib/modulos/` | Casos de uso, validaciones, contratos y consultas por dominio. |
| `lib/infraestructura/` | Conexión Drizzle/`pg`, esquemas PostgreSQL, Better Auth y adaptador de correo. Las migraciones versionadas están en `drizzle/`. |
| `lib/presentacion/` | Formatos y adaptación de filtros para las pantallas administrativas. |
| `lib/negocio-publico.ts` | Datos de contacto públicos. |
| `pruebas/`, `e2e/`, `scripts/` | Arnés de pruebas, recorridos de navegador y comandos operativos. Los datos de la demo viven en `scripts/demo/`. |

Los Server Components consultan servicios en servidor. La UI llama a Server Actions y Route Handlers según el flujo. Las pantallas privadas, acciones y handlers validan permisos en servidor. Las interfaces administrativas y públicas reciben proyecciones ajustadas a su uso.

## Responsabilidades de los módulos

| Módulo | Responsabilidad actual |
| --- | --- |
| Autenticación y cuenta | Sesión persistida con Better Auth, provisión controlada de una administradora, cambio y recuperación de contraseña. Resend se usa para entregar correos de recuperación. |
| Productos | Datos comerciales, categorías predefinidas, slug estable, imágenes en Cloudinary, visibilidad y destacados. |
| Inventario | Saldos, ajustes y movimientos. Recibe la transacción del alta de Productos para inicializar saldo y registrar la carga inicial cuando corresponde. |
| Proveedores | Datos de proveedores y estado activo/inactivo. |
| Compras y Ventas | Operaciones con líneas, importes e historial. Registran efectos sobre stock y sus reversas a través de Inventario. |
| Egresos y Finanzas | Gastos manuales y sus anulaciones. Finanzas compone ventas, compras y gastos vigentes para el resultado aproximado. |
| Catálogo | Proyección pública de Productos e Inventario. Las listas y las fichas aplican sus propias condiciones de visibilidad. |

El saldo se guarda en Inventario. Las operaciones que afectan stock coordinan sus cambios en PostgreSQL con transacciones, claves de idempotencia y restricciones. Las pantallas públicas consultan el catálogo por solicitud. Los productos publicados agotados mantienen su ficha y los ocultos quedan fuera del sitio público. Ver [ADR-008](adr/ADR-008-nextjs-fronteras.md) y [reglas de dominio](REGLAS_DOMINIO.md).

## Rutas vigentes y pendientes

`/admin` muestra el resumen. Productos, Inventario y Operaciones tienen sus propios destinos. Las rutas `/admin/finanzas`, `/admin/reportes` y `/admin/egresos` redirigen para mantener enlaces anteriores. `/admin/configuracion` conserva una pantalla de muestra protegida. El tema administrativo persistente y las categorías personalizadas quedan para entregas posteriores.

Para levantar el proyecto y verificar datos y servicios por entorno, seguí el [README](../README.md) y [Desarrollo](DESARROLLO.md). Los documentos de planificación histórica y los ADR conservan el contexto de sus respectivas etapas.
