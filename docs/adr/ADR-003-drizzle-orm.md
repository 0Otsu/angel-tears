# ADR-003: Drizzle ORM para acceso a PostgreSQL

**Estado: ACEPTADO**

Aceptación humana explícita: 19/10/2026, indicada por el equipo del proyecto (decisión del responsable). Un agente no acepta ADR por su cuenta: esta aceptación proviene de esa indicación humana. La revisión del PR que incorpora este ADR sigue pendiente.

## Contexto

Angel Tears es un monolito modular con Next.js full-stack, TypeScript y PostgreSQL ([ADR-001](ADR-001-monolito-modular.md), [ADR-002](ADR-002-nextjs-fullstack.md)). PostgreSQL está elegido pero no conectado: hasta ahora no hay capa de acceso a datos, esquema ni migraciones.

El dominio exige operaciones críticas que modifican varios registros a la vez (compras, ventas, anulaciones y stock) y que deben aplicarse completas o no aplicarse ([REGLAS_DOMINIO](../REGLAS_DOMINIO.md), [SEGURIDAD](../SEGURIDAD.md)). Eso requiere transacciones explícitas y consultas controladas. La primera funcionalidad que necesitará persistencia es la autenticación ([ADR-004](ADR-004-better-auth.md)).

## Alternativas

La elección la tomó el responsable del proyecto. Esta documentación no evaluó las alternativas en detalle; se listan solo las habituales para el stack:

- **Drizzle ORM** con `drizzle-kit` para migraciones: esquema en TypeScript y consultas cercanas a SQL.
- **Prisma:** esquema propio en un DSL y cliente generado.
- **SQL directo con un driver (`pg`)** sin ORM: máximo control, sin tipado de esquema ni migraciones integradas.

## Decisión

Usar **Drizzle ORM** como capa de acceso a PostgreSQL, con **drizzle-kit** para generar y aplicar migraciones.

Esta decisión solo elige la tecnología. **No diseña tablas ni el modelo de datos del negocio**: Producto, Proveedor, Compra, Venta, Egreso y el resto se definirán en las tareas de cada módulo, a partir de las fuentes validadas. La primera funcionalidad solo incorporará las tablas que necesite la autenticación.

## Razones

- Esquema tipado en TypeScript, coherente con el resto del proyecto.
- Migraciones versionadas y reproducibles, requisito de la persistencia terminada ([MAPA_IMPLEMENTACION](../MAPA_IMPLEMENTACION.md), sección 9).
- Consultas explícitas y legibles, útiles para operaciones donde importa saber exactamente qué se ejecuta.
- Soporte de transacciones para las operaciones críticas de compras, ventas y stock.
- Better Auth tiene adaptador para Drizzle (ADR-004), de modo que auth y dominio comparten una única capa de acceso.

## Consecuencias

- Hay que mantener el esquema y las migraciones al día; el esquema es la fuente de las migraciones y no se editan a mano en la base.
- El acceso a datos ocurre solo en servidor: nada de importar el cliente de base de datos en Client Components ni exponer sus credenciales al navegador.
- Se necesita un **driver de PostgreSQL**, que la decisión del responsable no menciona. Se propone `pg` (node-postgres) porque es el que figura en las dependencias de pares de Better Auth; se confirma al implementar. Es una dependencia adicional a justificar en la tarea.
- Versiones verificadas en el registro de npm el 19/10/2026: `drizzle-orm` 0.45.4 y `drizzle-kit` 0.31.11, dentro del rango que declara Better Auth (`drizzle-orm ^0.45.2`, `drizzle-kit >=0.31.4`). Fijar versiones exactas al instalar, como en el resto del proyecto.
- Las tablas de autenticación las genera Better Auth según su configuración y se integran al esquema de Drizzle; las migraciones siguen gestionándose con drizzle-kit.
- Las transacciones y el control de concurrencia de stock se diseñan en las tareas de compras y ventas; este ADR solo asegura que la herramienta las soporta.
- **Siguen sin decidirse:** hosting del servidor, proveedor final de PostgreSQL, pooling y política de backups. Para desarrollo y pruebas hará falta una instancia local de PostgreSQL; cómo se levanta se define en la tarea de implementación.
- Cambiar esta decisión requiere un ADR que la reemplace.
