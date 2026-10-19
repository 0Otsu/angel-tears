# Trazabilidad y sincronización SRS/RUP del MVP

**19/10/2026.** Estado: referencia de planificación suministrada por el responsable; SRS/RUP canónicos aún no están versionados. No certifica cobertura ni crea identificadores RF/RNF/CU nuevos. Los RF-01..21 siguientes fueron provistos expresamente en la tarea de arquitectura, no inferidos de la UI. Antes de aceptación académica se deben contrastar texto, versión y criterios con la fuente corregida.

## 1. Fuentes y clasificación

Orden: SRS → RUP → decisiones de producto/reglas → ADR → blueprint → OpenSpec → código. Una herramienta técnica no es un caso de uso. Las decisiones nuevas aprobadas figuran en [producto, sección 8](DECISIONES_PRODUCTO_MVP.md#8-actualización-expresa-de-arquitectura-y-producto--19102026); diseño en [blueprint](BLUEPRINT_IMPLEMENTACION_MVP.md).

Clasificación de análisis solicitada: **A** cobertura candidata por RF/RNF existente; **B** conviene ampliar RF existente; **C** probablemente requiere nuevo RF (sin asignar número); **D** afecta prototipo/interfaz; **E** afecta RUP/CU/actividad; **F** técnica, no requisito SRS por sí misma. A/B/C son hipótesis hasta contrastar fuentes; pueden coexistir D/E. «RNF acceso», etc., son temas suministrados, no IDs inventados.

## 2. Referencia funcional conocida → capacidad / ronda

| RF suministrado / nombre | Capacidad y destino | Cambio activo o roadmap | Evidencia futura, hoy no implementada |
| --- | --- | --- | --- |
| RF-01 Iniciar sesión | Auth/Cuenta, Emi R1 | implement-admin-auth-account | Credenciales correctas/incorrectas y acceso directo protegido. |
| RF-02 Cerrar sesión | Auth/Cuenta, Emi R1 | implement-admin-auth-account | Revocación efectiva y rechazo al volver al admin. |
| RF-03 Consultar parte pública | Público/SEO, Augusto R1 | implement-products-public-seo | Listado/PDP/metadata/negocio accesibles sin sesión y sin privados. |
| RF-04 Registrar producto | Productos, Augusto R1 | implement-products-public-seo | Guardado real y saldo cero atómico; publicar exige imagen. |
| RF-05 Consultar productos | Productos, Augusto R1 | implement-products-public-seo | Consulta administrativa persistida, filtros/estados aplicables. |
| RF-06 Modificar producto | Productos, Augusto R1 | implement-products-public-seo | Slug estable y precios históricos intactos; conflictos controlados. |
| RF-07 Gestionar visibilidad pública | Productos/Público, Augusto R1 | implement-products-public-seo | Publicado/oculto, agotados y 404 conforme a A. |
| RF-08 Stock bajo | Inventario, Claudio R1 | implement-inventory-suppliers-purchases | `<=`, null excluido, cero real; no usar etiqueta de fixture. |
| RF-09 Registrar proveedor | Proveedores, Claudio R1 | implement-inventory-suppliers-purchases | Nombre requerido, contactos opcionales. |
| RF-10 Modificar proveedor | Proveedores, Claudio R1 | implement-inventory-suppliers-purchases | Historia preservada e inactivación según gap. |
| RF-11 Consultar proveedores | Proveedores, Claudio R1 | implement-inventory-suppliers-purchases | Lectura real con activo/inactivo y vacío/error diferenciados. |
| RF-12 Registrar compra | Compras, Claudio R1 | implement-inventory-suppliers-purchases | Cabecera/líneas/importes/movimientos en una tx. |
| RF-13 Consultar compras | Compras, Claudio R1 | implement-inventory-suppliers-purchases | Fecha real, costos/supplier snapshot y estado histórico. |
| RF-14 Anular compra | Compras, Claudio R1 | implement-inventory-suppliers-purchases | Reversión única, completa o rechazada por negativo. |
| RF-15 Registrar venta | Ventas R2, owner no asignado | Roadmap, sin change activo | Stock suficiente/oculto interno, múltiples líneas y precio histórico. |
| RF-16 Consultar ventas | Ventas R2 | Roadmap | Historia y fechas reales; comprador opcional/Consumidor Final. |
| RF-17 Anular venta | Ventas R2 | Roadmap | Estado/historia y reintegro único. |
| RF-18 Registrar egreso | Finanzas/Egresos R2 | Roadmap | Concepto/importe/fecha, sin duplicar compra. |
| RF-19 Consultar egresos | Finanzas/Egresos R2 | Roadmap | Vigentes/anulados y período correcto. |
| RF-20 Anular egreso | Finanzas/Egresos R2 | Roadmap | Historia y exclusión, sin doble anulación. |
| RF-21 Consultar resultado económico aproximado | Finanzas R2 | Roadmap | Fórmula con vigentes, ARS, precisión y fechaOperacion. |

RNF temáticos aportados: acceso restringido, protección de información, separación público/privado, consistencia, conservación ante error, historial, mensajes comprensibles, disponibilidad pública, acceso web, PC/mobile y contenido indexable. Relacionarlos con controles/pruebas de [SEGURIDAD](SEGURIDAD.md), [TESTING](TESTING.md) y blueprint; no asignar números ni métricas no recibidas.

## 3. Gaps y acciones precisas

| Capacidad aprobada / fuente | Clasificación candidata | Acción SRS pendiente | Impacto RUP/prototipo y evidencia |
| --- | --- | --- | --- |
| Recuperación email J | C + E + D; RNF protección también aplica | Verificar si ya existe; si falta, proponer requisito nuevo sin número, con respuesta neutra/enlace de un uso | CU recuperación y especificación de éxito/expirado/usado, actividad y prototipo; E2E + consumo concurrente. |
| Cambio autenticado de contraseña K/actualización 8 | C/B + E + D | Confirmar cobertura de gestión de cuenta; definir política de sesiones antes de cerrar recorrido | CU/flujo autenticado con contraseña actual, error y éxito; no confundir con recuperación. |
| Sesión persistente I4 | B/A(RNF acceso) + E | Ampliar criterios de RF-01/02 o RNF de acceso con plazo aprobado | Flujos alternativos de sesión válida/vencida; casos negativos. |
| Invalidación de sesiones J3 | B/A(RNF protección) + E | Agregar criterios a recuperación/logout si falta | Actividad de reset y pruebas de revocación; política del cambio autenticado sigue abierta. |
| Provisión controlada de administradora | F y posible RNF operación | Documentar operación segura, no crear RF público de registro | Procedimiento de despliegue; modelo User/Account; no CU «usar Drizzle». |
| Ajustes manuales B3 y saldo inicial B4 | C/B + E + D | Contrastar si RF-08/gestión stock ya cubre ajustes; ampliar o proponer RF sin número | CU/actividad de ajuste con motivo/historia/no negativo; carga inicial; prototipo y CRC Inventario/Ajuste. |
| Historial de ajustes | B/A(RNF historial) + E | Explicitar trazabilidad de ajustes y no reemplazo de saldo | Consulta/historia y secuencia de fallos; modelo Movimiento/Ajuste, sin ledger contable nuevo. |
| Imagen principal administrable A6/L | B + D + E | Completar RF-04/06/07: una principal y obligación al publicar, preservar anterior | Formulario/flujo de reemplazo y fallo; modelo referencia Imagen; sin CMS. |
| Destacado booleano, actualización 8 | B/C + D + E | Verificar ampliación de RF-04/06/03 o requisito nuevo necesario; no asignar RF adicional | Edición de flag y Home elegible, actividad publicación si corresponde; sin campañas/ranking. |
| PDP publicada agotada A2 | B + D + E | Completar RF-03/07 con excepción de acceso directo agotado | Alternativa de consulta «Sin stock» y prototipo; metadata/JSON-LD consistentes. |
| Oculto con 404 A3 | B/A(RNF separación) + D + E | Criterio de RF-03/07 para acceso directo | Flujo no encontrado y caché; no afirmar ocultación por esconder enlaces. |
| Tema claro/oscuro admin-only, actualización 8 | C/B + D, E solo si requiere CU propio | Verificar si preferencia persistente ya cubierta; proponer formalización proporcional | Prototipo y actividad de guardar preferencia; no CU artificial por cada color. Modelo preferencia por cuenta. |
| Dashboard operativo, actualización 8 | A/B para consultas existentes + D; C si aparece capacidad nueva | Mantener agregados de RF-08/16/21; validar cualquier indicador adicional antes de declararlo obligatorio | Prototipo/consulta inicial; no convertir widgets del template en RF. |
| Finanzas agrupa resultado+egresos | D + E; A para RF-18..21 | Organización de UI no exige otro RF si no cambia capacidades | Actualizar navegación/prototipos/actividades de acceso; mantener fórmula y consultas. |
| Proveedor inactivo D3 / tarea actual | B + E + D | Revisar RF-10 y criterios de selección en RF-12 | Alternativa de inactivación con historia; baja sin historial no aprobada. |
| Drizzle/BA/Resend/Zod/Cloudinary/testing | F | No convertir marcas de herramientas en RF funcionales | ADR/modelo técnico y pruebas; no CU de «usar ORM». |
| SEO local/OG/Product/schema/canonical | A/B por RF-03 + RNF indexabilidad; D | Precisar criterios de indexabilidad/compartir sin prometer ranking | Prototipos/links; metadatos técnicos por sí solos no generan un CU independiente. |

## 4. Checklist para sincronizar fuentes externas

- [ ] Incorporar versión corregida/canónica de SRS y RUP con fecha/origen; validar que RF-01..21 coinciden, sin reemplazar por este resumen.
- [ ] Para cada gap resolver A/B/C con el responsable/cátedra y copiar solo IDs reales recibidos al change/feature correspondiente.
- [ ] Actualizar alcance y RNF/criterios de los RF ampliados; separar aprobación de producto de validación académica.
- [ ] Revisar diagrama general de CU: capacidades nuevas reales, actores sin roles/clientes nuevos y fronteras de administración/público.
- [ ] Revisar especificaciones de CU afectadas: precondiciones, éxito, errores, agotado/oculto, anulación, insuficiente y recuperación.
- [ ] Revisar actividades del sistema para atomicidad observable, conservación ante error y flujos alternativos; no modelar librerías como tareas de usuario.
- [ ] Sincronizar prototipos con Finanzas/Cuenta/Configuración y destacado; Home pública conserva su identidad visual.
- [ ] Revisar análisis/clases/CRC con un solo Producto, Inventario, líneas/movimientos y auth; no confundir clases conceptuales con tablas generadas del framework.
- [ ] Añadir evidencia de tests y enlaces a cambios/código cuando exista implementación; no completar esta lista por escribir el blueprint.

## 5. Regla de continuación

Las aprobaciones del responsable permiten planificar y preparar slices sin afirmar SRS/RUP canónicos. Si una fuente superior recibida contradice el diseño, registrar diferencia y obtener resolución humana antes del cambio afectado. Un gap bloquea el comportamiento que depende de él, no impide trabajar en partes independientes. No elegir una política de producto desconocida para completar un checkbox OpenSpec.
