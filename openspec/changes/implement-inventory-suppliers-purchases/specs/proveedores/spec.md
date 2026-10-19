# Spec Delta

## Purpose

Gestionar los datos mínimos de proveedores necesarios para compras, permitiendo inactivarlos sin perder referencias ni nombres históricos de operaciones anteriores.

Fuente D1–D4 y tarea actual; RF-09..11 de referencia, SRS/RUP canónicos pendientes. [Trazabilidad](../../../../../docs/TRAZABILIDAD_MVP.md).

## ADDED Requirements

### Requirement: Datos mínimos de proveedor
El sistema SHALL registrar y modificar proveedores con nombre obligatorio y teléfono, Instagram y notas opcionales, sin exigir datos fiscales/bancarios ni unicidad de nombre no aprobada.

#### Scenario: Datos opcionales omitidos
- **WHEN** la administradora registra un proveedor con nombre y sin contactos/notas
- **THEN** puede guardarlo y consultarlo sin solicitar campos adicionales.

#### Scenario: Nombre ausente
- **WHEN** se intenta guardar sin nombre
- **THEN** se rechaza con error de campo sin perder entradas no sensibles.

### Requirement: Inactividad e historia
El sistema SHALL conservar proveedores utilizados históricamente y permitir inactivarlos para que no se ofrezcan en compras nuevas, sin eliminar operaciones previas ni reescribir el nombre histórico de estas.

#### Scenario: Cambio posterior de nombre
- **WHEN** se modifica el nombre de un proveedor que aparece en una compra
- **THEN** la compra conserva el nombre utilizado al registrarse.

#### Scenario: Inactivar proveedor utilizado
- **WHEN** se inactiva un proveedor con compras anteriores
- **THEN** esas compras permanecen consultables y el proveedor no se ofrece para una nueva compra.

### Requirement: Baja no definida no inferida
El sistema SHALL abstenerse de habilitar eliminación de proveedores sin historial hasta contar con decisión explícita; la presencia de un botón del template no la autoriza.

#### Scenario: Preparación de acciones del listado
- **WHEN** se implementan las acciones de Proveedores
- **THEN** solo se incluyen las operaciones aprobadas y no una baja inferida de un componente visual.
