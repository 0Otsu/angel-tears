# Spec Delta

## Purpose

Permitir a una única administradora acceder, mantener y recuperar su cuenta con protección verificable del área privada, sin registro público ni capacidades comerciales nuevas.

Fuente: I/J y actualización 8 de decisiones; RF-01/02 de referencia humana, SRS/RUP canónicos pendientes. [Trazabilidad](../../../../../docs/TRAZABILIDAD_MVP.md).

## ADDED Requirements

### Requirement: Cuenta inicial controlada
El sistema SHALL permitir provisionar una sola cuenta administrativa por un mecanismo controlado y SHALL rechazar registro público, sin roles ni cuentas adicionales.

#### Scenario: Provisión repetida
- **WHEN** se intenta provisionar una cuenta cuando ya existe la administradora
- **THEN** la operación se rechaza sin crear otra cuenta ni cambiar credenciales existentes.

#### Scenario: Registro desde la web
- **WHEN** un visitante llama directamente un endpoint de registro
- **THEN** no puede crear una cuenta, aunque conozca la URL.

### Requirement: Acceso privado validado
El sistema SHALL autenticar con email único y contraseña y verificar identidad/autorización en servidor para toda lectura o mutación administrativa; el teléfono comercial no es identificador de acceso.

#### Scenario: Credenciales inválidas
- **WHEN** se ingresa un email o contraseña incorrectos
- **THEN** no se crea sesión y se muestra error neutro sin revelar existencia de la cuenta.

#### Scenario: Acceso directo sin sesión
- **WHEN** se abre admin o se llama una mutación privada sin sesión válida
- **THEN** no se entregan datos privados ni se aplica la mutación y se solicita autenticación según el contexto.

### Requirement: Persistencia y cierre de sesión
El sistema SHALL conservar una sesión válida hasta 30 días en dispositivo propio, ofrecer cierre manual y exigir autenticación al expirar o revocarse; no basta navegación visual para cerrar sesión.

#### Scenario: Reapertura y vencimiento
- **WHEN** se reabre el panel con sesión vigente o con sesión vencida
- **THEN** la primera conserva el acceso y la segunda requiere login sin entregar datos privados.

#### Scenario: Logout efectivo
- **WHEN** la administradora cierra sesión y vuelve a una URL privada
- **THEN** la sesión ya no autoriza el acceso.

#### Scenario: Login ya autenticado
- **WHEN** se abre login con sesión válida
- **THEN** se redirige al panel sin pedir nuevamente las credenciales.

### Requirement: Recuperación neutra por email
El sistema SHALL recibir un email y responder de forma neutra; para la cuenta válida permite restablecer mediante enlace temporal de un uso, sin recuperación por teléfono, SMS o preguntas secretas.

#### Scenario: Solicitud sin revelar existencia
- **WHEN** se solicita recuperar con un email registrado o no registrado
- **THEN** la respuesta no permite distinguir la existencia de la cuenta y no expone tokens ni fallos internos de entrega.

#### Scenario: Enlace inválido o vencido
- **WHEN** se usa un enlace inválido, vencido o ya utilizado
- **THEN** no cambia la contraseña ni crea sesión y permite solicitar otro enlace.

### Requirement: Reset con revocación global
El sistema SHALL consumir el enlace una sola vez junto con el cambio de contraseña y la invalidación de todas las sesiones anteriores, sin login automático; un fallo no deja una combinación parcial de esos efectos.

#### Scenario: Reset correcto
- **WHEN** se restablece con un enlace válido
- **THEN** la nueva contraseña queda vigente, el enlace y las sesiones anteriores dejan de autorizar y se vuelve al login.

#### Scenario: Consumo concurrente
- **WHEN** dos solicitudes usan simultáneamente el mismo enlace
- **THEN** solo una puede restablecer y la otra no reaplica el efecto.

### Requirement: Cuenta separada de apariencia
El sistema SHALL mostrar nombre/email y permitir cambio autenticado de contraseña verificando la actual desde Cuenta/Auth, sin habilitar edición de email/nombre ni preferencias visuales por inferencia.

#### Scenario: Contraseña actual incorrecta
- **WHEN** la administradora intenta cambiar la contraseña autenticada con la actual incorrecta
- **THEN** se rechaza y conserva la credencial existente sin registrar secretos.

#### Scenario: Política todavía pendiente
- **WHEN** se prepara la aceptación del cambio autenticado de contraseña
- **THEN** debe constar la decisión del responsable sobre otras sesiones antes de cerrar ese recorrido; no se presupone la política de recuperación.
