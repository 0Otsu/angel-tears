# ADR-001: monolito modular

**Estado: ACEPTADO COMO DIRECCIÓN INICIAL - PENDIENTE DE REVISIÓN DEL EQUIPO**

## Contexto

Angel Tears es un sistema para un negocio pequeño con sitio público y administración. El MVP necesita reglas consistentes de stock, compras, ventas, anulaciones y resultados; el equipo necesita poder mantener y explicar la solución.

## Alternativas

- Monolito modular: una aplicación y una base de datos con límites explícitos por dominio.
- Monolito sin separación de responsabilidades: inicio simple pero mayor riesgo de duplicación y acoplamiento.
- Microservicios y repositorios múltiples: mayor independencia operativa con complejidad de despliegue, comunicación y consistencia no justificada para este alcance.

## Decisión

Adoptar como dirección inicial un **monolito modular**, con una aplicación y una base de datos. Módulos previstos: autenticacion, productos, inventario, proveedores, compras, ventas, egresos y reportes.

La dirección está aceptada inicialmente y debe ser revisada por el equipo. No constituye selección de framework, lenguaje, motor de base de datos ni estructura física de archivos.

## Razones

Simplicidad, modularidad, mantenibilidad, facilidad de evolución y reglas de negocio explícitas. Mantener una operación y despliegue comprensibles y facilitar consistencia transaccional sin distribuir el dominio innecesariamente.

Evitar microservicios, múltiples repositorios, event-driven innecesario, infraestructura compleja y abstracciones sin necesidad real.

## Consecuencias

- Cuidar los límites y contratos entre módulos dentro de una misma aplicación.
- Las reglas compartidas no deben duplicarse en interfaces o módulos consumidores.
- La aplicación se desplegará como una unidad; los módulos no tendrán despliegue independiente bajo esta dirección.
- La propiedad de datos, los contratos y la implementación de transacciones se definirán posteriormente.
- Revisar esta dirección requiere decisión humana documentada; un agente no puede cambiarla silenciosamente.
