# Producto

Angel Tears es un sistema web para un negocio pequeño de accesorios. Busca facilitar el descubrimiento público de productos e información del negocio y la gestión administrativa cotidiana.

## Personas y contextos

- Visitantes: consultan catálogo e información comercial desde celular o computadora y acceden a WhatsApp e Instagram.
- Responsable del negocio: administra productos, stock, proveedores y movimientos y consulta resultados aproximados.

No se incluyen cuentas de clientes, múltiples administradores, roles ni múltiples sucursales en el MVP. Sofía utiliza una cuenta administrativa única con email/contraseña; decisiones funcionales y sus actualizaciones en [DECISIONES_PRODUCTO_MVP.md](DECISIONES_PRODUCTO_MVP.md). Auth real todavía no existe.

## Fuente de verdad

La IA no es la fuente de verdad. Prioridad ante contradicciones:

1. SRS corregida/validada.
2. Artefactos RUP corregidos por la cátedra.
3. Decisiones de producto aprobadas + reglas de dominio documentadas.
4. ADR aceptados.
5. Blueprint técnico.
6. OpenSpec para cambios concretos, sin reemplazar SRS/RUP.
7. Código que implementa esas fuentes.

La tarea específica respeta estos límites; sugerencias de IA no son fuentes aprobadas. Una nueva capacidad, caso de uso o regla debe proponerse y evaluar SRS/RUP/prototipos/decisiones/ADR/OpenSpec antes de implementarse. Los templates son referencia visual reutilizable, no requisitos.

Esta base recoge las instrucciones iniciales. La SRS validada y los artefactos RUP corregidos no se adjuntaron. Incorporarlos y resolver diferencias con el equipo antes de afirmar trazabilidad o validación formal. No se asignan identificadores RF/CU nuevos.

Un agente no puede cambiar alcance, reglas de negocio o arquitectura aceptada por su cuenta. Las discrepancias se registran y resuelven con intervención humana.

## Lecturas relacionadas

El [alcance](ALCANCE.md) delimita el MVP; las [reglas](REGLAS_DOMINIO.md) describen invariantes; las [decisiones pendientes](DECISIONES_PENDIENTES.md) exponen lo que aún no está definido.
