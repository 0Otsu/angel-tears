# Autenticación de la Administradora

Especificación del slice de autenticación. **Es una definición de alcance para una implementación futura: no implementa nada.** La implementación se hará en una rama `feature/auth` posterior, solo después de que el equipo revise y mergee esta documentación.

## RF relacionado
PENDIENTE: SRS validada aún no incorporada. No se inventa un RF.

## CU relacionado
PENDIENTE: artefactos RUP corregidos aún no incorporados. No se inventa un CU.

## Objetivo
Reemplazar el login y el logout mock por acceso administrativo real: la Administradora entra con email y contraseña, mantiene la sesión hasta aproximadamente 30 días en su dispositivo, puede cerrarla, recupera el acceso por email si olvida la contraseña y puede cambiarla estando autenticada. Quien no tiene sesión válida no accede a `/admin`.

## Contexto
- Hoy: login que solo navega a `/admin`; `/admin` y sus subrutas son accesibles por URL directa; "Cerrar sesión" es un enlace; el usuario "Administradora · Usuario mock" es texto fijo; `/admin/configuracion` es un vacío explicativo. No hay base de datos, auth, sesiones ni tests.
- Fuentes consultadas: [AGENTS](../../AGENTS.md), [ARQUITECTURA](../ARQUITECTURA.md), [SEGURIDAD](../SEGURIDAD.md), [TESTING](../TESTING.md), [DESARROLLO](../DESARROLLO.md), [DEFINICION_TERMINADO](../DEFINICION_TERMINADO.md), [DECISIONES_PRODUCTO_MVP](../DECISIONES_PRODUCTO_MVP.md) (I, J, K), [DECISIONES_PENDIENTES](../DECISIONES_PENDIENTES.md) y [MAPA_IMPLEMENTACION](../MAPA_IMPLEMENTACION.md) (secciones 5.1, 6, 7, 8 y EPIC-03).
- Módulo: `autenticacion`.
- Decisiones técnicas: [ADR-003 Drizzle](../adr/ADR-003-drizzle-orm.md), [ADR-004 Better Auth](../adr/ADR-004-better-auth.md) (incluye Resend para la recuperación y la cuenta inicial), [ADR-005 Zod](../adr/ADR-005-zod-validacion.md) y [ADR-006 testing](../adr/ADR-006-testing.md). Todos en estado ACEPTADO (19/10/2026); la revisión del PR que los incorpora sigue pendiente.
- Supuesto explícito: las decisiones de producto I, J y K están aprobadas por el responsable pero pendientes de alineación con la SRS/RUP; si las fuentes definitivas las contradicen, se resuelve con intervención humana antes de implementar el comportamiento afectado.

## Reglas de negocio
Aprobadas en [DECISIONES_PRODUCTO_MVP](../DECISIONES_PRODUCTO_MVP.md); este documento no las redefine.

- Una sola Administradora; sin registro público, sin multiadministrador ni roles (I1, I5, I6).
- Identificador de acceso: email único + contraseña. El teléfono comercial no es identidad de acceso (I2, I3).
- Sesión persistente de hasta 30 días en dispositivo propio, con cierre manual y nueva autenticación al expirar (I4).
- Recuperación solo por email: email → respuesta neutra → enlace temporal de un solo uso → nueva contraseña → invalidación del enlace → nuevo login, sin iniciar sesión automáticamente (J1, J2, J4).
- Tras restablecer la contraseña por recuperación se invalidan **todas** las sesiones anteriores (J3).
- Configuración (K1): mostrar nombre y email de la cuenta y permitir cambiar la contraseña estando autenticada. **Sin edición de email en este slice.**
- Autorización siempre en servidor; ocultar enlaces no es seguridad ([SEGURIDAD](../SEGURIDAD.md)).

## Alcance de la implementación futura
1. **Login real** en `/admin/login` con email y contraseña.
2. **Sesión persistente** según la política aprobada.
3. **Protección de `/admin`** y todas las rutas hijas, verificada en servidor.
4. **Logout** que invalida la sesión.
5. **Recuperación** de contraseña por email (`/admin/recuperar`).
6. **Restablecimiento** de contraseña con enlace temporal de un solo uso.
7. **Cambio de contraseña autenticado** en `/admin/configuracion`, más visualización de nombre y email.
8. **Creación controlada de la primera Administradora** mediante script de setup, no desde una página pública (ver ADR-004).
9. Redirección de una Administradora ya autenticada que visita `/admin/login` hacia `/admin`.

Rutas: se revisan las existentes antes de crear nuevas. La ruta exacta de restablecimiento depende de cómo Better Auth entrega el token (ver ADR-004) y se documenta cualquier diferencia con la propuesta del mapa.

Base de datos: solo las tablas que la autenticación necesite. **No** se crean Producto, Stock, Proveedor, Compra, Venta, DetalleCompra, DetalleVenta, Egreso ni Reportes.

Interfaz: se adapta la UI mock existente conservando su diseño (por ejemplo, el campo de acceso pasa a email y se retira el aviso "sin autenticación"). No se rediseña la administración ni se cambia la UI pública.

## Criterios de aceptación
Definición de terminado del slice. La futura implementación está terminada cuando:

- [ ] Existe una cuenta administrativa inicial creada mediante un mecanismo controlado.
- [ ] No existe registro público: no hay página de alta y el endpoint de alta no crea cuentas.
- [ ] Un email y una contraseña válidos permiten entrar.
- [ ] Credenciales incorrectas muestran un error comprensible y neutro, sin revelar si el email existe.
- [ ] `/admin` y sus subrutas rechazan a usuarios sin sesión y los envían a `/admin/login`, sin cargar datos privados.
- [ ] Una sesión válida permite usar el panel.
- [ ] La sesión puede persistir según la política aprobada (hasta aproximadamente 30 días).
- [ ] El logout invalida la sesión en el servidor; volver atrás o acceder directo no recupera el panel.
- [ ] Una Administradora autenticada que visita `/admin/login` termina en `/admin`.
- [ ] La recuperación no revela si un email existe (misma respuesta y tiempos razonablemente uniformes).
- [ ] Se envía el correo de recuperación (en pruebas, mediante un doble controlado; nunca datos reales).
- [ ] El token de recuperación es temporal y de un solo uso.
- [ ] La nueva contraseña invalida el token.
- [ ] Las sesiones anteriores quedan invalidadas después del restablecimiento.
- [ ] El cambio de contraseña autenticado funciona, exigiendo la contraseña actual.
- [ ] Los errores no muestran secretos ni trazas al usuario; los registros no contienen contraseñas ni tokens.
- [ ] Existen validaciones del lado servidor, además de las de cliente.
- [ ] Hay límite de intentos en login y en la solicitud de recuperación.
- [ ] Los secretos están en variables de entorno; no hay `.env` versionado y existe un `.env.example` sin valores reales.
- [ ] Los tests críticos pasan.
- [ ] `pnpm lint` pasa.
- [ ] `pnpm typecheck` pasa.
- [ ] `pnpm build` pasa.
- [ ] La documentación queda actualizada.
- [ ] Revisión humana y PR revisado por otro integrante ([DEFINICION_TERMINADO](../DEFINICION_TERMINADO.md)); el responsable puede explicar lo implementado.
- [ ] Trazabilidad RF/CU definitiva (bloqueada hasta incorporar SRS/RUP).

## Fuera de alcance
- Productos, compras, ventas, proveedores, stock, egresos y reportes.
- Registro público, multiadministrador, roles y permisos por rol.
- Edición de email (aprobada solo como "visible"; su cambio no se implementa).
- SMS, OAuth, login social, magic links, 2FA y preguntas secretas.
- Verificación de email al alta.
- Uso de Resend para marketing, newsletters, pedidos u otras notificaciones.
- Cambios en la UI pública y rediseño del panel.
- Decisiones de hosting, proveedor final de PostgreSQL, almacenamiento de imágenes, observabilidad y analytics.
- Provisión de la cuenta en producción y despliegue.

## Casos de error
| Disparador | Respuesta esperada | Datos que se conservan |
| --- | --- | --- |
| Email o contraseña incorrectos | Mensaje neutro; no se crea sesión; no se confirma si la cuenta existe | Ninguno sensible; se puede conservar el email escrito |
| Demasiados intentos | Mensaje de espera, sin bloquear de forma indefinida a la única Administradora | Sin cambios en la cuenta |
| Acceso a `/admin` sin sesión o con sesión vencida | Redirección a `/admin/login`; sin datos privados | Sin cambios |
| Solicitud de recuperación con email inexistente | Misma respuesta neutra que con email existente; no se envía correo | Sin cambios |
| Fallo del proveedor de correo | Respuesta pública neutra; registro protegido sin token ni URL; la persona puede pedir otro enlace | Sin cambios de contraseña |
| Token inválido, vencido o ya usado | Mensaje claro con opción de pedir otro enlace; no cambia la contraseña | Contraseña y sesiones sin cambios |
| Nueva contraseña no cumple la política | Error por campo; el enlace no se gasta | Token vigente |
| Contraseña actual incorrecta al cambiar | Error por campo; no se cambia | Contraseña vigente |
| Intento de dar de alta una cuenta por el endpoint de registro | Rechazo; no se crea usuario | Sin cambios |
| Base de datos o correo no disponibles | Error seguro, sin trazas ni SQL; no se presenta como éxito | Sin cambios |
| Sesión expirada mientras se usa un formulario | La escritura no se aplica; se pide iniciar sesión de nuevo | Sin operación duplicada |

## Tests esperados
Según [ADR-006](../adr/ADR-006-testing.md): Vitest (unitarios e integración contra PostgreSQL de pruebas), React Testing Library (formularios) y Playwright (flujos completos). No se busca cobertura del 100%.

Obligatorios:
- login correcto;
- login incorrecto;
- protección de `/admin` sin sesión (páginas y comandos privados);
- sesión persistente;
- logout;
- recuperación con respuesta neutra (email existente e inexistente);
- token inválido;
- token vencido;
- cambio de contraseña autenticado;
- invalidación de sesiones anteriores tras el restablecimiento.

Adicionales sugeridos:
- el endpoint de registro no crea cuentas;
- un token usado no se puede reutilizar;
- una contraseña rechazada por la política no gasta el enlace;
- redirección de `/admin/login` a `/admin` con sesión válida;
- el script de creación de la Administradora se niega a crear una segunda cuenta;
- no se filtran contraseñas, tokens ni secretos en errores ni en registros;
- el limitador de intentos responde sin bloquear indefinidamente.

## Dependencias
- ADR-003 a ADR-006, ACEPTADOS. La implementación no empieza hasta que el equipo revise y mergee la documentación (PR de esta etapa).
- Entorno local con Node 24.15.0, pnpm 11.25.0 y una instancia de PostgreSQL de desarrollo y pruebas.
- Cuenta de Resend y clave de API para pruebas manuales; en tests, un doble controlado.
- **Bloqueos de fuente o decisión que siguen abiertos:**
  - SRS/RUP validados y trazabilidad RF/CU.
  - Renovación de sesión: plazo absoluto de 30 días o ventana que se renueva con el uso.
  - Duración exacta del enlace de recuperación y política de reemisión (candidato: 1 hora, valor por defecto de la librería).
  - Tratamiento de las demás sesiones al cambiar la contraseña desde Configuración (K1).
  - Provisión de la cuenta en producción y soporte seguro si se pierde el acceso al email.
  - Hosting, proveedor final de PostgreSQL y dominio remitente de Resend.
  - Dónde guarda el limitador de intentos sus datos.

## Notas/decisiones
- Esta etapa es solo documental: no se instala ninguna dependencia, no se crean tablas, no se crea el script de setup y no se toca la UI.
- La documentación decisional y la implementación van en PRs separados: primero `docs/auth-stack-ebenitez`, luego `feature/auth`.
- Si durante la implementación hace falta cambiar alcance, requisito, decisión de producto, arquitectura o tecnología aprobada, se detiene el trabajo, se explica el bloqueo y se proponen alternativas; no se cambia en silencio.
- Los ADR figuran como aceptados por indicación humana del equipo (19/10/2026). Cualquier propuesta o pendiente que no esté en un ADR aceptado no se trata como decisión tomada.
