# ADR-005: Zod para validación de entradas

**Estado: ACEPTADO**

Aceptación humana explícita: 19/10/2026, indicada por el equipo del proyecto (decisión del responsable). La revisión del PR que incorpora este ADR sigue pendiente.

## Contexto

[SEGURIDAD.md](../SEGURIDAD.md) exige validar entradas en servidor y aclara que las comprobaciones de interfaz no las sustituyen. TypeScript solo comprueba tipos en compilación: no valida datos que llegan de formularios, parámetros de URL o peticiones en tiempo de ejecución. Hasta ahora el único formulario es el login mock, validado solo con `required` de HTML.

## Alternativas

La elección la tomó el responsable del proyecto. Esta documentación no evaluó alternativas en detalle. Entre las habituales están Valibot, Yup o validar a mano.

## Decisión

Usar **Zod** para validar entradas no confiables.

Alcance:

- Formularios y sus datos al llegar al servidor (Server Actions o Route Handlers que se aprueben en cada tarea).
- Límites del servidor: parámetros de ruta y de búsqueda, cuerpos de petición y variables de entorno cuando se justifique.
- Reutilizar un mismo esquema en cliente y servidor cuando sea razonable, para dar mensajes tempranos por campo sin duplicar reglas.

Esta decisión **no** crea todavía esquemas para el dominio. Cada tarea define los esquemas que necesite, a partir de reglas y campos aprobados. El primer uso será la autenticación: formato de email, contraseña nueva y su confirmación.

## Razones

- Valida en tiempo de ejecución y a la vez infiere tipos TypeScript.
- Permite expresar mensajes de error por campo, necesarios para la matriz de estados UX ([MAPA_IMPLEMENTACION](../MAPA_IMPLEMENTACION.md), secciones 12 y 14).
- Un solo lugar por regla de formato reduce divergencias entre pantalla y servidor.

## Consecuencias

- **La validación de cliente orienta; la del servidor decide.** Todo dato externo se vuelve a validar en servidor aunque la pantalla ya lo haya validado.
- **Zod no reemplaza las reglas de negocio.** Reglas como stock nunca negativo, una anulación una sola vez o resultado sin doble conteo pertenecen al dominio y se aplican en servidor dentro de la transacción. Una validación de formato correcta no autoriza una operación.
- Zod 4.6.7 ya existe en el árbol como dependencia transitiva de ESLint (documentado en [MIGRACION_UI](../MIGRACION_UI.md)); pasa a ser dependencia directa de la aplicación. Se fija la versión exacta al instalar.
- Better Auth valida internamente sus propias entradas; los esquemas Zod de la aplicación cubren los formularios y rutas propios, sin duplicar lo que la librería ya controla.
- Moneda, decimales, fechas y rangos se validarán con los criterios aprobados (decisiones H) en las tareas que los usen. No se anticipan aquí.
- **No se elige** librería de formularios del cliente (por ejemplo, React Hook Form): sigue pendiente y se justifica en la tarea que la necesite.
- Cambiar esta decisión requiere un ADR que la reemplace.
