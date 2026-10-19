# Decisiones de producto del MVP de Angel Tears

Fecha de aprobación: **19/10/2026**.

## 1. Contexto, aprobación y autoridad

Este documento registra las elecciones funcionales del responsable para cerrar ambigüedades detectadas en el [mapa de implementación](MAPA_IMPLEMENTACION.md). Las respuestas de los bloques A–M, incluida A1 acordada previamente, se consolidaron en un resumen por módulo. El responsable respondió **«si»** a la pregunta: «¿Confirmás que estas decisiones reflejan lo que querés para el MVP?». Esa aprobación autoriza esta entrega documental, su commit, push y PR hacia main; no autoriza implementación ni merge.

Clasificación aplicable a las decisiones aprobadas:

> Decisión de producto aprobada por responsable, pendiente de alineación/formalización con SRS/RUP cuando corresponda.

Se respeta la jerarquía de [AGENTS.md](../AGENTS.md). La SRS corregida/validada y los artefactos RUP corregidos aún no están versionados. No se inventan RF/CU, no se declara trazabilidad definitiva y no se sobrescribe una fuente superior. Los códigos A1–M4 identifican preguntas de esta conversación, **no requisitos RF/CU**.

Las reglas aquí aprobadas no convierten los mocks en funciones reales. La aplicación sigue en UI Foundation, sin persistencia, autenticación real ni operaciones de negocio implementadas. Esta tarea no modifica código, dependencias, UI, rutas, infraestructura ni datos.

## 2. Decisiones aprobadas por módulo

### A. Catálogo público y ficha de producto

| Código | Decisión aprobada |
| --- | --- |
| A1 | Cuando el stock llega a cero, el producto deja de aparecer en el **listado público**. No se elimina: conserva historial y permanece en administración. Reaparece automáticamente al reponer stock si sigue publicado. Esta decisión no define por sí sola la PDP. |
| A2 | La PDP de un producto publicado sin stock sigue accesible por su URL y muestra «Sin stock». |
| A3 | Un producto ocultado manualmente desaparece del listado y responde **404** al acceder directamente a su URL. |
| A4 | El listado público incluye únicamente productos publicados con stock mayor que cero. Publicado con stock cero queda fuera del listado; oculto con cualquier stock también queda fuera. La PDP sigue A2/A3. |
| A5 | Un producto oculto puede venderse internamente si tiene stock. |
| A6 | Nombre, precio y categoría obligatorios. Imagen obligatoria **para publicar**; se permite guardar el producto oculto/borrador sin imagen. Descripción, material, medidas, color y cuidados opcionales. La disponibilidad se deriva automáticamente del stock y no se edita manualmente. |

**Razón:** separar publicación, disponibilidad y acceso directo sin perder productos ni historial.

**Consecuencias:** catálogo y PDP necesitan políticas distintas; reponer stock recupera la presencia en el listado sin republicar si el producto seguía publicado. Ocultar sí impide acceso público directo. La obligación de imagen se valida al publicar; «borrador» no introduce por sí solo un ciclo adicional de estados.

**Alternativas descartadas:** mostrar agotados en el listado; retirar la PDP publicada solo por agotarse; permitir acceso directo a ocultos; editar disponibilidad independientemente del stock; exigir imagen para cualquier guardado.

**Impacta:** catálogo, PDP, productos, validación, ventas internas y SEO. La política específica de sitemap, metadata y caché no se elige aquí.

### B. Stock e inventario

| Código | Decisión aprobada |
| --- | --- |
| B1 | Stock bajo significa **stock <= mínimo**. |
| B2 | Mínimo opcional. Sin mínimo no participa en la alerta. Cero es un mínimo real y es distinto de ausencia de mínimo. |
| B3 | Permitir ajustes manuales explícitos de incremento/decremento, indicando cantidad y **motivo obligatorio**, con fecha automática e historial conservado. Nunca stock negativo. No reemplazar silenciosamente el saldo sin trazabilidad. |
| B4 | Registrar existencias previas mediante saldo/ajuste inicial identificado. No crear una compra ficticia ni afectar el resultado económico con esa carga inicial. |
| B5 | Solo unidades enteras para este MVP. |
| B6 | Si una venta supera el disponible, bloquearla, informar stock disponible y conservar el formulario. No reducir automáticamente la cantidad solicitada. |

**Razón:** corregir existencias reales con trazabilidad, distinguir mínimo cero de mínimo ausente y evitar ventas inconsistentes.

**Consecuencias:** el inventario deberá conservar ajustes identificados y probar límites, saldo inicial y efectos de operaciones. Ejemplo del umbral: stock 3/mínimo 3 es bajo; stock 0/mínimo 0 también; stock 0/sin mínimo no participa en esa alerta. Ningún cambio autoriza negativos.

**Alternativas descartadas:** comparación estricta `<`; interpretar cero como ausencia de mínimo; impedir todos los ajustes; reemplazar libremente el saldo; compras ficticias iniciales; cantidades fraccionarias; autoajustar una venta al disponible.

**Impacta:** inventario, compras, ventas, validación, historial y pruebas de integridad.

### C. Gestión de productos

| Código | Decisión aprobada |
| --- | --- |
| C1 | No eliminar físicamente productos. Ocultar/despublicar y conservar historial. |
| C2 | Cambiar el precio actual no modifica precios históricos de operaciones. |
| C3 | Cambiar el nombre no cambia automáticamente la URL/slug. URL estable para este MVP. |
| C4 | Lista fija inicial de categorías, sin CRUD adicional. Valores iniciales **propuestos**, pendientes de validar con la propietaria: Collares, Pulseras, Anillos, Aros / Piercings, Tobilleras, Llaveros y Flores eternas. Combos no tiene que ser una categoría si puede representarse como producto. |

**Razón:** simplificar la gestión y mantener referencias e importes históricos.

**Consecuencias:** despublicar no borra operaciones; renombrar no exige cambiar enlaces. La estrategia de categorías está aprobada, pero la lista comercial final sigue pendiente. No se infiere una función de bundles ni descuento de componentes para Combos.

**Alternativas descartadas:** eliminación física, reescritura de precios históricos, cambio automático de URL al renombrar y CRUD de categorías para el MVP.

**Impacta:** productos, historia, enlaces y categorías.

### D. Proveedores

| Código | Decisión aprobada |
| --- | --- |
| D1 | Nombre obligatorio; teléfono, Instagram y observaciones opcionales. No agregar CUIT, datos bancarios, domicilio fiscal u otros campos sin necesidad. |
| D2 | Proveedor opcional en una compra. |
| D3 | Un proveedor utilizado históricamente no se elimina. Puede marcarse inactivo para no ofrecerlo en nuevas compras. |
| D4 | Las compras conservan el nombre del proveedor utilizado al registrarse, aunque luego cambie su nombre. |

**Razón:** admitir compras reales con información mínima y conservar referencias históricas.

**Consecuencias:** la inactividad afecta la selección para nuevas compras; no elimina registros anteriores. La eliminación de proveedores sin historial no quedó definida.

**Alternativas descartadas:** proveedor obligatorio en toda compra; campos fiscales/bancarios por defecto; borrar proveedores usados; cambiar retroactivamente el nombre histórico de una compra.

**Impacta:** proveedores, compras e historial.

### E. Compras

| Código | Decisión aprobada |
| --- | --- |
| E1 | Registrar fecha real de compra, productos/cantidades, costo unitario histórico y total calculado. Proveedor y observación opcionales. |
| E2 | Una compra puede tener múltiples productos/líneas. |
| E3 | Conservar fecha real de compra y fecha automática de carga. |
| E4 | Conservar costo histórico por línea. |
| E5 | Anular conserva el registro, marca la compra anulada y revierte stock exactamente una vez. Si la reversión produciría stock negativo, se rechaza toda la anulación, sin efectos parciales. |
| E6 | Una compra confirmada no se edita. Ante un error, anular según las reglas y registrar otra correctamente. |

**Razón:** conservar historia e importes y evitar reversiones inconsistentes.

**Consecuencias:** la compra confirmada aumenta stock y se cuenta una sola vez en el resultado, según las reglas existentes. Corregirla no permite eludir el bloqueo de anulación por stock insuficiente; no se aprueban anulaciones parciales.

**Alternativas descartadas:** una sola línea obligatoria, sustituir la fecha real por la de carga, recalcular costos pasados, editar compras confirmadas, borrar al anular o revertir parcialmente.

**Impacta:** compras, proveedores, inventario, reportes e integridad.

### F. Ventas

| Código | Decisión aprobada |
| --- | --- |
| F1 | Una venta puede contener múltiples productos/líneas. |
| F2 | Comprador opcional. Si no se informa, tratar como Consumidor Final. No crear módulo Clientes. |
| F3 | Conservar precio de venta histórico por línea. |
| F4 | Permitir venta interna de producto oculto si tiene stock. |
| F5 | Anular conserva la venta y reintegra stock exactamente una vez. |
| F6 | No editar ventas confirmadas. Anular y registrar otra correctamente. |
| F7 | Conservar fecha real de venta y fecha automática de carga. |

**Razón:** registrar ventas internas sin ampliar el alcance a gestión de clientes y sin perder historia.

**Consecuencias:** confirmar verifica/descuenta stock; el stock insuficiente bloquea la operación según B6. Un precio actual nuevo no reescribe ventas anteriores. Deben probarse confirmación/anulación únicas y concurrencia.

**Alternativas descartadas:** comprador obligatorio, módulo Clientes, bloquear venta interna solo por ocultación, editar ventas confirmadas o borrar ventas al anular.

**Impacta:** ventas, inventario y reportes.

### G. Egresos manuales

| Código | Decisión aprobada |
| --- | --- |
| G1 | Concepto, importe y fecha real obligatorios; observación opcional y fecha de carga automática. |
| G2 | Una compra no se registra nuevamente como egreso manual. |
| G3 | Anular conserva historial y excluye el egreso del resultado vigente. |
| G4 | No editar egresos confirmados. Anular y registrar otro correctamente. |

**Razón:** evitar doble conteo y conservar la historia de correcciones.

**Consecuencias:** las consultas separan compras de egresos manuales y excluyen anulados. No se incorpora clasificación contable por inferencia.

**Alternativas descartadas:** duplicar compras como egresos, edición de confirmados y eliminación al anular.

**Impacta:** egresos, reportes y trazabilidad.

### H. Dinero y reportes

| Código | Decisión aprobada |
| --- | --- |
| H1 | Única moneda del MVP: pesos argentinos (**ARS**). |
| H2 | Admitir hasta dos decimales. Si se ingresa mayor precisión, validar y rechazar; no redondear silenciosamente. |
| H3 | Resultado = ventas vigentes − compras vigentes − egresos manuales vigentes. Excluir todas las operaciones anuladas. |
| H4 | Nombre: **«Resultado económico aproximado»**. No presentarlo como ganancia contable ni contabilidad profesional. |
| H5 | Mes actual por defecto, selección de otro mes y rango personalizado. No agregar «Hoy» al MVP por ahora. |
| H6 | Los reportes usan la fecha real de la operación, no la fecha de carga. |

**Razón:** una lectura económica consistente y comprensible con filtros útiles para el negocio.

**Consecuencias:** resumen y reportes deben usar los mismos criterios; la carga inicial B4 no integra la fórmula. La precisión funcional no selecciona tipos SQL, unidades internas ni una librería monetaria.

**Alternativas descartadas:** multimoneda, redondeo silencioso, sumar anulados, duplicar compras, presentar ganancia contable y filtrar por fecha de carga.

**Impacta:** validación monetaria, fechas, compras, ventas, egresos y reportes.

### I. Cuenta, acceso y sesiones

| Código | Decisión aprobada |
| --- | --- |
| I1 | Una única administradora inicial. |
| I2 | Identificador de acceso: email único + contraseña. |
| I3 | El teléfono comercial no es identificador de acceso. |
| I4 | Experiencia deseada: sesión persistente **hasta 30 días** en dispositivo propio, cierre manual disponible y nueva autenticación al expirar. Es una decisión de producto/UX, no una tecnología. |
| I5 | Sin registro público de administradores. |
| I6 | Multiadministrador y roles fuera del MVP. |

**Razón:** facilitar el acceso cotidiano de la responsable con un alcance administrativo acotado.

**Consecuencias:** la solución futura debe permitir persistencia limitada, cierre y expiración efectivos, con autorización en servidor. No se fijan cookies, tokens, librería ni reglas técnicas de renovación/inactividad por deducción del plazo UX.

**Alternativas descartadas:** teléfono como login, pedir autenticación en cada apertura pese a sesión vigente, sesión indefinida, registro abierto y múltiples administradores/roles.

**Impacta:** login, sesiones, seguridad y pruebas de acceso.

### J. Recuperación de cuenta

| Código | Decisión aprobada |
| --- | --- |
| J1 | **Recuperación por email incluida formalmente en el MVP por decisión del responsable.** Ya no es una mera propuesta de inclusión, aunque falta alineación con SRS/RUP. |
| J2 | Email → respuesta neutra → enlace temporal de un solo uso → nueva contraseña → invalidación del enlace → volver al login. |
| J3 | Después de recuperar/cambiar la contraseña mediante recuperación, invalidar **todas** las sesiones anteriores y exigir nuevo login. |
| J4 | Recuperación únicamente mediante email. Sin SMS, teléfono ni preguntas secretas. |

**Razón:** recuperar el acceso a la única cuenta sin mantener sesiones anteriores después del restablecimiento.

**Consecuencias:** recuperación y revocación global pasan a ser capacidades futuras requeridas por esta decisión. Deben probarse expiración, uso único, respuesta neutra y revocación. No se fijan duración exacta del enlace, política de reemisión, proveedor de correo ni mecanismo técnico.

**Alternativas descartadas:** dejar recuperación fuera del MVP, conservar sesiones tras recuperar contraseña, iniciar sesión automáticamente al terminar y usar canales alternativos.

**Impacta:** alcance de Auth, recuperación, sesiones, correo y seguridad.

### K. Configuración de cuenta

| Código | Decisión aprobada |
| --- | --- |
| K1 | Conservar `/admin/configuracion` únicamente para mostrar nombre/email de la cuenta y permitir cambio de contraseña estando autenticada. Sin temas, roles, sucursales, impuestos, CMS, configuraciones técnicas ni preferencias inventadas. Si editar email implica complejidad adicional de seguridad, dejarlo solo visible y gestionar su cambio fuera del panel. No se da por autorizada automáticamente su edición. |

**Razón:** mantener funciones reales de cuenta sin convertir una reserva visual en un módulo genérico de configuración.

**Consecuencias:** nombre/email visibles no implican edición de nombre aprobada. La condición sobre edición de email sigue pendiente de resolución; tampoco se definió la política de sesiones al cambiar contraseña desde Configuración. J3 se refiere expresamente a recuperación, no se extiende silenciosamente a este flujo.

**Alternativas descartadas:** quitar la navegación, mantener únicamente un placeholder como solución final y añadir preferencias sin necesidad.

**Impacta:** cuenta, Configuración y seguridad. No nace una entidad/tabla genérica ni un épico funcional independiente.

### L. Imágenes de producto

| Código | Decisión aprobada |
| --- | --- |
| L1 | La administradora puede subir/reemplazar la imagen de producto desde Admin. |
| L2 | Una imagen principal por producto en el MVP. |
| L3 | Si falla la nueva imagen, conservar la anterior, informar el error y no dejar una referencia rota. |

**Razón:** permitir gestión real de productos preservando la imagen disponible ante fallos.

**Consecuencias:** la carga/reemplazo forma parte del objetivo de Productos y debe coordinarse con A6. No se decide almacenamiento, proveedor, formatos, tamaños ni política de limpieza en esta conversación.

**Alternativas descartadas:** imágenes gestionadas solo mediante despliegue para productos, galería múltiple obligatoria y perder la imagen anterior cuando falla el reemplazo.

**Impacta:** productos, publicación, almacenamiento futuro y estados de error.

### M. Contenido del negocio

| Código | Decisión aprobada |
| --- | --- |
| M1 | Horarios pendientes de confirmación definitiva. Mantener **«Consultar horarios vigentes»**; no usar horarios históricos como definitivos. |
| M2 | Confirmados: Entre Ríos 924, planta baja detrás de las escaleras, Concordia; Instagram **@angeltears.ac**; WhatsApp **+54 9 3454 26-6760**. |
| M3 | Mantener recursos actuales para el MVP. Reemplazar posteriormente Street View/historias por material original de mayor calidad cuando la propietaria lo proporcione. |
| M4 | Horarios, dirección, Instagram y WhatsApp no necesitan CMS. Cambios mediante código/despliegue controlado. Productos e imágenes de producto sí se administran desde el panel. |

**Razón:** usar información comercial confirmada y evitar incorporar un CMS sin necesidad.

**Consecuencias:** la imagen actual sigue siendo una edición de Street View con atribución, no una fotografía nueva del comercio. El texto provisional de horarios permite continuar sin afirmar un horario definitivo. No se requiere reemplazar los recursos actuales como condición nueva de cierre del MVP.

**Alternativas descartadas:** tomar horarios antiguos como vigentes, convertir Home en CMS y exigir nuevas imágenes originales para esta entrega.

**Impacta:** Home, local, contacto, contenido y operación de cambios comerciales.

## 3. Pendientes que permanecen

| Tema | Qué falta / límite |
| --- | --- |
| SRS/RUP y trazabilidad | Incorporar fuentes definitivas, contrastar estas decisiones y resolver contradicciones con intervención humana. No asignar RF/CU inventados. |
| Categorías iniciales | Validar con la propietaria si falta o sobra alguna de las siete propuestas. La estrategia de lista fija sí está aprobada. |
| Horarios | Obtener confirmación definitiva. Mantener el texto aprobado mientras tanto. |
| Edición de email | Resolver la condición de K1 al evaluar seguridad; no asumir que el panel permite editarlo. |
| Cambio autenticado de contraseña | Definir tratamiento de sesiones para el flujo de Configuración. No extender automáticamente J3 fuera de recuperación. |
| Proveedores sin historial | Su eliminación no se definió. D3 resuelve únicamente la conservación de proveedores utilizados y su inactivación para nuevas compras. |
| Detalles restantes de validación y estados | Límites de campos/importes/fechas, límites exactos del rango temporal y estados no resueltos expresamente siguen sujetos a fuentes y a la tarea correspondiente. No inferirlos de fixtures. |
| Contenido comercial restante | La aprobación de contactos/recursos no aporta por sí sola un logo limpio ni un catálogo real completo. Conservar esos vacíos del registro previo; el reemplazo fotográfico futuro no se vuelve obligatorio por M3. |
| Calidad y operación | Métricas no funcionales, provisión inicial de cuenta, soporte seguro y procedimientos operativos requieren definición aplicable; no se inventan objetivos ni mecanismos. |

## 4. Formalización requerida y fuentes relacionadas

Las decisiones de ajustes manuales B3/B4, recuperación J1–J4, cuenta/Configuración K1 y administración de imágenes L1–L3 son elecciones explícitas del responsable, **no inferencias a partir del mock**. Deben alinearse con SRS/RUP como el resto del documento. Su aprobación de producto no equivale a una declaración de RF existente o de implementación terminada.

| Fuente | Relación y formalización futura |
| --- | --- |
| [REGLAS_DOMINIO.md](REGLAS_DOMINIO.md) | Contrastar A–H: visibilidad/PDP, mínimo, ajustes, historia, correcciones, moneda y períodos. La redacción anterior que indicaba esos puntos como pendientes no se sobrescribe silenciosamente. |
| [ALCANCE.md](ALCANCE.md) | Formalizar recuperación, capacidades mínimas de cuenta e imágenes; conservar exclusiones. |
| [PRODUCTO.md](PRODUCTO.md) | Alinear identidad, contenido y resultado aproximado cuando corresponda. |
| [SEGURIDAD.md](SEGURIDAD.md) | Alinear I–K con requisitos de acceso, recuperación, revocación y operaciones autorizadas; decisiones técnicas mediante ADR. |
| [UX_UI.md](UX_UI.md) | Alinear catálogo/PDP, validaciones, stock insuficiente, carga fallida y cuenta. Sin rediseñar UI en esta entrega. |
| [DECISIONES_PENDIENTES.md](DECISIONES_PENDIENTES.md) | Marcar únicamente elecciones realmente resueltas y mantener pendientes explícitos. |
| [MAPA_IMPLEMENTACION.md](MAPA_IMPLEMENTACION.md) | Actualización puntual de bloqueos/decisiones, según sección siguiente. |

Estas alineaciones futuras no autorizan reescribir ahora las fuentes existentes. Si las fuentes definitivas contradicen una elección, registrar la diferencia y obtener resolución humana antes de implementar el comportamiento afectado.

## 5. Relación con el mapa de implementación

La auditoría describe UI Foundation, no un MVP operativo. Este documento resuelve elecciones de producto, **no su ausencia de implementación**.

- Se conserva el análisis histórico de la auditoría del 16/10 y su ampliación del 17/10; una nota fechada indica qué decisiones quedan sustituidas por esta aprobación.
- Se actualizan puntualmente bloqueos de producto de la sección 27, la clasificación de recuperación/Configuración de la matriz ejecutiva y las condiciones de los épicos afectados por esas decisiones. No se agregan épicos ni tickets.
- Recuperación deja de ser propuesta de inclusión y pasa a **❌ NO IMPLEMENTADO** dentro del alcance aprobado por responsable, con formalización SRS/RUP pendiente. Las URLs candidatas continúan siendo propuestas, no rutas nuevas aprobadas o creadas.
- Configuración sigue siendo **🟣 UI/MOCK**. La capacidad de cuenta quedó acotada, pero su lógica/validación real no existe.
- Ningún cambio marca persistencia, lógica de negocio, autenticación o pruebas como implementadas. Los ADR y requisitos formales pendientes no se dan por cerrados.

El mapa se incorporó originalmente mediante el commit `14c515cc36b2d39ac9ba4a4054d6799f9dcb400e`, aún en el [PR #2](https://github.com/0Otsu/angel-tears/pull/2) al iniciar esta entrega. La rama documental nace de main e incorpora ese commit existente como antecedente para poder modificar el mapa sin reescribirlo. No se modifica main ni se mergea/cierra ese PR automáticamente; mientras siga abierto, el PR de decisiones contiene ese antecedente documental.

## 6. Decisiones técnicas deliberadamente no tomadas

- ORM/acceso a datos, esquema físico, tipos SQL, migraciones y conexión a PostgreSQL.
- Librería de autenticación, sesiones, cookies/tokens, hashing y controles técnicos concretos.
- Proveedor de correo, duración exacta del enlace de recuperación y política de reemisión.
- Almacenamiento/proveedor de imágenes y detalles técnicos de carga/limpieza.
- Librería de validación, framework de pruebas, CI, hosting/deployment, observabilidad y secretos.

Los ADR de arquitectura ya aceptados conservan su autoridad. Las preferencias funcionales no seleccionan herramientas por implicación. No se instalan dependencias ni se crean ADR nuevos en esta entrega.

## 7. Límite de cierre

Esta aprobación permite **documentar y abrir un PR sin mergearlo**. No inicia Persistencia ni ningún otro épico, no elige ORM/auth y no autoriza código, CRUD, rutas, UI o infraestructura. La revisión de otro integrante y la alineación con fuentes definitivas permanecen pendientes según el flujo del repositorio.
