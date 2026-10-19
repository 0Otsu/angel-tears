# Spec Delta

## Purpose

Permitir a una única administradora acceder, mantener y recuperar su cuenta con protección verificable del área privada, sin registro público ni capacidades comerciales nuevas.

Fuente: I/J y actualizaciones 8/9 de decisiones; máximo absoluto de sesión 30 días y recovery 1 hora aprobados por responsable, pendientes de formalización SRS/RUP. RF-01/02 de referencia humana, sin IDs nuevos. [Trazabilidad](../../../../../docs/TRAZABILIDAD_MVP.md).

## ADDED Requirements

### Requirement: Cuenta inicial controlada
El sistema SHALL permitir provisionar una sola cuenta administrativa por un mecanismo controlado, idempotente/seguro y documentado, sin contraseña en argumentos CLI, salida o logs, y SHALL rechazar registro público, sin roles ni cuentas adicionales.

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

#### Scenario: Sesión vencida al enviar
- **WHEN** la sesión vence antes de enviar un formulario administrativo
- **THEN** se rechaza sin aplicar ni duplicar la operación, se solicita login y solo pueden conservarse campos no sensibles de forma segura, limpiando contraseñas y sin reenvío automático.

#### Scenario: Base de datos indisponible
- **WHEN** la base de datos falla durante login o una operación privada
- **THEN** se muestra error técnico recuperable sin éxito falso, SQL, stacks ni secretos; solo se conservan campos seguros y se limpian contraseñas.

### Requirement: Persistencia y cierre de sesión
El sistema SHALL limitar la sesión a un máximo absoluto de 30 días desde el login, sin extenderlo por uso diario, ofrecer cierre manual y exigir nuevo login al vencer o revocarse; no basta navegación visual para cerrar sesión. La implementación comprobará opciones y comportamiento de la versión fijada de Better Auth para cumplir esta política.

#### Scenario: Reapertura y vencimiento
- **WHEN** se reabre el panel con sesión vigente o con sesión vencida
- **THEN** la primera conserva el acceso y la segunda requiere login sin entregar datos privados.

#### Scenario: Logout efectivo
- **WHEN** la administradora cierra sesión y vuelve a una URL privada
- **THEN** la sesión ya no autoriza el acceso.

#### Scenario: Uso diario y máximo absoluto
- **WHEN** se usa el panel cada día y se alcanza el máximo de 30 días desde login
- **THEN** la sesión deja de autorizar y exige nuevo login; la actividad anterior no extiende el máximo.

#### Scenario: Login ya autenticado
- **WHEN** se abre login con sesión válida
- **THEN** se redirige al panel sin pedir nuevamente las credenciales.

### Requirement: Recuperación neutra por email
El sistema SHALL recibir un email y responder de forma neutra incluso ante fallo interno de envío; para la cuenta válida permite restablecer mediante enlace temporal de 1 hora y un uso, sin recuperación por teléfono, SMS o preguntas secretas.

#### Scenario: Solicitud sin revelar existencia
- **WHEN** se solicita recuperar con un email registrado o no registrado
- **THEN** la respuesta no permite distinguir la existencia de la cuenta y no expone tokens ni fallos internos de entrega.

#### Scenario: Enlace inválido o vencido
- **WHEN** se usa un enlace inválido, vencido o ya utilizado
- **THEN** no cambia la contraseña ni crea sesión y permite solicitar otro enlace.

#### Scenario: Vencimiento a la hora
- **WHEN** se usa el enlace al alcanzar 1 hora desde su emisión
- **THEN** está vencido y no permite restablecer; probar también el caso válido antes de ese límite.

#### Scenario: Fallo de entrega o de base de datos al solicitar
- **WHEN** falla internamente el envío de correo o el acceso a datos durante la solicitud de recuperación
- **THEN** se mantiene la respuesta pública neutra sin revelar existencia de email, token, URL ni diagnóstico interno; registrar solo información segura y conservar como máximo el email ingresado.

### Requirement: Reset con revocación global
El sistema SHALL consumir el enlace una sola vez junto con el cambio de contraseña y la invalidación de todas las sesiones anteriores, sin login automático; un fallo no deja una combinación parcial de esos efectos.

#### Scenario: Reset correcto
- **WHEN** se restablece con un enlace válido
- **THEN** la nueva contraseña queda vigente, el enlace y las sesiones anteriores dejan de autorizar y se vuelve al login.

#### Scenario: Consumo concurrente
- **WHEN** dos solicitudes usan simultáneamente el mismo enlace
- **THEN** solo una puede restablecer y la otra no reaplica el efecto.

#### Scenario: Contraseña nueva rechazada antes de completar
- **WHEN** la política rechaza la nueva contraseña antes de completar el restablecimiento
- **THEN** no cambia la credencial y el enlace no debe consumirse si la versión fijada de Better Auth lo soporta; verificar con integración, documentar evidencia o limitación y resolver el criterio antes de cierre, sin afirmar garantía de librería no comprobada.

#### Scenario: Solicitud de segundo enlace
- **WHEN** se solicita otro enlace antes de vencer el anterior durante la implementación del flujo
- **THEN** se comprueba/documenta el comportamiento de la versión fijada, se prefiere invalidar el anterior con soporte nativo maduro y se registra la decisión antes de cerrar recuperación; si no existe soporte directo, no se crea infraestructura propia compleja. La política sigue pendiente hasta esa comprobación/decisión.

### Requirement: Errores seguros y protección de abuso
El sistema SHALL limitar abuso en endpoints sensibles sin bloqueo indefinido de la única administradora y aplicar la matriz de errores del diseño, conservando solo campos no sensibles cuando sea seguro. SHALL omitir SQL, stacks, tokens, URLs de recovery, contraseñas y secretos en errores/respuestas y logs; no inventar aquí intentos exactos ni tiempos de bloqueo.

#### Scenario: Demasiados intentos
- **WHEN** se alcanza el límite técnico de intentos que se concrete al implementar/operar
- **THEN** se limita la solicitud con orientación segura sin revelar existencia de email ni bloquear indefinidamente a la única administradora; recuperación conserva neutralidad respecto de identidad y entrega.

### Requirement: Cuenta separada de apariencia
El sistema SHALL mostrar nombre/email de solo lectura y permitir cambio autenticado de contraseña verificando la actual y acceso a logout desde `/admin/cuenta`, sin edición de identidad/roles/perfil complejo. `/admin/configuracion` queda reservado únicamente a claro/oscuro persistente exclusivo de `/admin/*`, fuera de este change; nunca modifica Home, catálogo, PDP ni identidad pública.

#### Scenario: Contraseña actual incorrecta
- **WHEN** la administradora intenta cambiar la contraseña autenticada con la actual incorrecta
- **THEN** se rechaza y conserva la credencial existente sin registrar secretos.

#### Scenario: Política todavía pendiente
- **WHEN** se prepara la aceptación del cambio autenticado de contraseña
- **THEN** debe constar la decisión del responsable sobre otras sesiones antes de cerrar ese recorrido; es el único bloqueo de ese subflujo, no de todo Auth, y no se presupone la revocación global de recuperación.
