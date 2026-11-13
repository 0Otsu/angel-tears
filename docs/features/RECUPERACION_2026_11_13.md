# Recuperación de Angel Tears — 13/11/2026

## Alcance y fuentes

Recuperar el trabajo existente tras la eliminación de la carpeta de OneDrive,
sin crear otro sistema ni integrar todavía a main. Checkout nuevo fuera de
OneDrive: `Angel-Tears-recuperado-2026-11-13`, rama
`recovery/angel-tears-20261113`, origen funcional
`36a4ed7cf474e8de784e9406223008981f617d71`.

Los commits `786b650` y `36a4ed7` conservan las consultas financieras,
paginación, existencias integradas, Gastos, Resumen y navegación horizontal.
`origin/main` comprobado en `4545c07`; no se mezclan ramas de compañeros.
Bundle completo verificado antes de editar. Las otras referencias remotas y
el reflog del clon no aportan una versión posterior a `36a4ed7`.

Se recuperaron literalmente cinco registros originales del 12/11, conservados
en el respaldo local `recuperacion-2026-11-13`: paleta, textos/Footer, ajuste
responsive del hero, metadata absoluta de Home y horarios. No se ejecutaron sus
comandos antiguos de servidor, capturas ni rutas de OneDrive: solo sus cambios
de fuente sobre el checkout nuevo. Las copias históricas de VS Code no se
copiaron como configuración completa. Los tres ZIP siguen intactos; los dos de
Sofi contienen referencias visuales, no el repositorio. El ZIP de Dashboard es
una referencia externa, no una implementación sustituta.

## Matriz de recuperación

| Capacidad | Evidencia recuperada | Acción / comprobación actual |
| --- | --- | --- |
| Resumen económico | `lib/modulos/finanzas`, `resumen-admin`, `786b650` / `36a4ed7` | Conservar. Render autenticado, gráfico y cifras cotejadas con SQL de solo lectura. |
| Productos / existencias | `productos-admin`, `editor-producto`, `existencias-producto`, `PRODUCTOS_EXISTENCIAS.md` | Conservar. Listado y editor reales; estimación 2 + 2 = 4 sin registrar ajustes. |
| Compras / Ventas | Servicios, contrato de Inventario y pruebas existentes | Conservar. Listados reales, estados y filtros; no repetir mutaciones históricas sobre la preview. |
| Gastos | `/admin/gastos`, servicios `egresos` | Conservar. Listado, detalle e historial consultados; no duplicar Compras. |
| Proveedores | Página y servicios existentes | Conservar. Render del estado vacío real de preview. |
| Paginación | `lib/paginacion`, servicios `lectura`, `OPERACIONES_LISTADOS.md` | Conservar LIMIT/OFFSET, 25 filas, orden fecha/id y snapshot por consulta. Filtros automáticos comprobados. |
| Navegación | `estructura-admin`, `36a4ed7` | Conservar tres áreas y cuatro pestañas; sin sidebar ni Inventario/Finanzas independientes. |
| Login | Página real, `MarcoAcceso`, Better Auth | Login normal confirmado por el responsable. Sin 404 reproducido. Corregir solamente el método nativo del formulario. |
| Público | Home/Catálogo/PDP y proyección existentes | Conservar reglas. Home y Catálogo renderizan; preview tiene todos sus productos ocultos. |
| Azul / semántica | Registro 01 y ZIP de paleta | Recuperar tokens y nueve adaptaciones originales; éxito/advertencias/errores conservan significado. |
| Hero / SEO / textos | Registros 02–04 y ZIP de propuesta | Recuperar Hero A, ajuste móvil y metadata sin duplicar marca. |
| Contacto / Footer / horarios | Registros 02 y 05 | Recuperar CTA, redes accesibles, columnas y lunes a viernes 16:00–20:30. |

El responsable confirmó previamente: «Aprobó todo con el Hero A:
Accesorios para cada versión de vos». Hero B permanece en la comparativa del
ZIP; no se añade un selector ni se publica como variante aprobada.

## Datos y entorno

- Contenedor original `angel-tears-local-pg17`, volumen original conservado,
  PostgreSQL local en `127.0.0.1:62075`.
- Desarrollo: siete productos, siete medios y doce movimientos; migraciones
  0000–0003. No contiene todavía las tablas posteriores de operaciones.
- La aplicación de revisión usa exclusivamente `angel_tears_preview_20261111`,
  con migraciones 0000–0006, cuatro productos, trece movimientos, cuatro compras,
  seis ventas y seis gastos. No se aplicaron migraciones ni seeds.
- También se conservan las bases demo y de pruebas previamente identificadas.
- Respaldo nuevo de desarrollo, formato custom, índice verificado con
  `pg_restore --list`; no se ensayó una restauración. Archivo fuera de Git:
  `angel-tears-dev-20261113-2030.dump`, SHA-256
  `9e854b522410bbcb6f3f216eb774ccd471e47cbcb3edb202600b1f5dd00ad480`.
- No se alteraron datos comerciales, saldos ni usuarios reales. El login normal
  de preview sí utiliza las sesiones propias de Better Auth.
- Configuración Cloudinary/Resend histórica no recuperada como credencial vigente.
  No se realizaron uploads, eliminaciones de assets ni envíos de correo.
- Se preparó `.env.local` nuevo y excluido de Git: conexión local comprobada a
  preview, secreto Auth aleatorio nuevo y servicios externos vacíos. No copia el
  archivo histórico ni modifica credenciales de usuarios. Tras el reinicio
  técnico se vuelve a iniciar sesión normalmente con la cuenta de preview.

## Login y registros

El servidor comprobado se ejecuta desde el checkout recuperado. La ruta
`/admin/login` existe y responde 200 anónimamente; con sesión redirige a Resumen.
No hay evidencia suficiente para atribuir el 404 anterior a una causa concreta.
La composición vigente conserva `casa-login.jpg`, distribución 44/56 y móvil.

El formulario interceptaba el submit con Better Auth, pero carecía de `method`:
sin hidratación, el navegador podía enviar sus campos por GET. Se declara POST
explícitamente y se añade regresión focalizada. No se cambian sesiones, cookies,
permisos ni la API de Auth. No se afirma haber reproducido el instante exacto
que originó la URL histórica. El log local de recuperación se redactó sin
imprimir valores; los registros originales se preservan fuera de Git.
Si la contraseña expuesta sigue vigente, corresponde rotarla mediante el flujo
normal; no se cambió ninguna contraseña durante esta recuperación.
Corrección aislada en el commit `1fffdf2`; la recuperación visual se conserva
en un commit separado, por trazabilidad.

## Validación y límites

- 53 pruebas de seis archivos de componentes: login, shell, Resumen, indicadores,
  uploader y filtros/paginación. 56 unitarias de paginación, períodos,
  agregación financiera y presentación de Operaciones. Total: 109 correctas.
- Lint y TypeScript correctos. Build de producción Webpack correcto, en copia
  de validación con las mismas fuentes y dependencias, para no interrumpir el
  dev server. Acceso a preview durante build con guardia SQL de solo lectura.
- OpenSpec strict: seis changes válidos; doctor saludable. Sin marcar tareas
  adicionales ni modificar SRS/RUP.
- Recorrido autenticado de Resumen, Productos/editor, ajuste sin confirmar,
  Ventas, Compras, Gastos/detalle y Proveedores. Filtro Mes anterior devuelve la
  venta histórica esperada; navegación de vuelta conserva el patrón existente.
- Noviembre en preview: ventas 105300.00 − compras 75000.00 − gastos 4300.50
  = 25999.50, excluidos anulados. Cifras verificadas con SQL de solo lectura.
- Home: un H1 y title/description restaurados. Enlaces públicos existentes
  conservados; dos redes en Footer y sin número de WhatsApp repetido en Contacto.
- Tras reiniciar con la configuración local nueva: Home/Catálogo/login 200,
  diez rutas privadas 307 sin sesión, y una PDP realmente oculta de preview 404.
  HTML inicial del login comprobado con `method="post"`. Las 19 fuentes de código
  recuperadas coinciden con las usadas en el build; se excluye `next-env.d.ts`
  regenerado por Next, sin incluir cambios de rutas generadas en el commit.
- Capturas antiguas/nuevas y verificaciones móviles bajo `work/`, excluidas de
  Git. Sin desbordamiento horizontal en los anchos comprobados.
- Contraste de tokens recuperados: botón 7,23:1, hover 6,21:1, enlaces sobre
  crema 6,68:1 y texto secundario del Footer 5,06:1. No auditoría AA integral.
- Se reutiliza evidencia anterior de integración/transacciones/concurrencia y
  volumen, sin presentarla como ejecución nueva. No suites masivas ni E2E
  transaccionales. Cloudinary y correo reales pendientes de configuración actual
  y comprobación autorizada; el código original permanece.

La recuperación no certifica aceptación E2E final, despliegue ni seguridad global.
La rama se respalda en GitHub para revisión; main queda intacto.

Evidencia local: `work/evidencia-recuperacion/compartir/index.html` y ZIP de
capturas `Angel-Tears-evidencia-recuperacion-20261113.zip`, fuera de Git. Incluyen
referencias A/B y capturas actuales de Resumen, Productos/existencias,
Operaciones, Gastos, Hero, Contacto, Footer y móvil. No incluyen configuración,
contraseñas, registros de servidor ni dumps. Consola del recorrido sin errores.
