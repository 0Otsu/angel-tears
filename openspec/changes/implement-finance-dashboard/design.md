## Diseño

Finanzas autoriza mediante el contrato existente de Auth antes de abrir lecturas. Reutiliza `resumirVentas`, `resumirCompras` y `resumirEgresos`, las mismas consultas detrás de los tres métodos administrativos `resumir`. Se componen en una transacción READ ONLY REPEATABLE READ (blueprint §6), en lugar de tres llamadas administrativas con conexiones/cortes independientes. No se modifica ningún módulo fuente.

Cada fuente tiene savepoint: un fallo SQL revierte solo esa lectura y permite presentar las fuentes sanas. El resultado conjunto queda no disponible si falta alguna fuente. Dashboard incluye evolución del mes calendario actual sin filtros, y comparte agregación exacta, autorización, período y tratamiento de errores con Finanzas.

Las proyecciones de evolución e historia pertenecen a la consulta financiera, sin escrituras. Los totales existentes cubren todas las operaciones del período; la historia visible es acotada e informa si hay más. La evolución agrupa por día o mes, exclusivamente operaciones vigentes persistidas. Dinero: decimal string → centavos bigint → decimal string firmado. Solo las coordenadas del gráfico se convierten a Number; etiquetas y tabla conservan el importe exacto.

Período predeterminado: mes actual en America/Argentina/Cordoba. Finanzas ofrece selector integrado Semana/Mes/Año con navegación automática, sin filtro «Hoy» inventado. RSC para lectura privada, formularios GET para filtros; gráfico Client con tabla accesible equivalente.

Errores de autorización se propagan; errores de fuente se presentan sin SQL, payload financiero ni secretos. No caché pública. Sin nuevas tablas, paquetes ni migraciones. Las capturas y pruebas de mutación usan exclusivamente PostgreSQL aislado y guardado, nunca desarrollo.

Refinamiento autorizado 11/11: Dashboard mantiene el mes actual; Por día/Por semana solo modifica el gráfico. Intervalos lunes-domingo recortados al mes; salidas apiladas y tooltip/tabla exactos. Evidencia en docs/features/FINANZAS.md.

Corrección de revisión humana: dos columnas Ingresos/Salidas, detalle inline sin cubrir controles, ventanas diarias de 7 días, intervalos semanales con fechas, Ver tienda accesible y skeletons/pending consistentes en el panel. Sin alterar servicios ni reglas. Evidencia en FINANZAS.md y UX_CARGAS_ADMIN.md.

Adaptación v0 autorizada: composición de cuatro tarjetas mensuales (2×2 móvil), gráfico con Inventario lateral; Finanzas prioriza Resultado, tres fuentes, gráfico, desglose y movimientos. Se reutilizan datos, filtros, intervalos y componentes existentes. El desglose suma centavos de las fuentes ya consultadas. El shell solo pierde sus breadcrumbs en esta iteración. Se descartan métricas/datos ficticios, shell, Analytics, dependencias y configuraciones de v0. Sin nuevos servicios ni cambios de seguridad o dominio. Referencia ZIP inspeccionada sin ejecución; capturas y comprobaciones en FINANZAS.md. Aceptación humana e integración pendientes.

Simplificación autorizada posterior del 11/11: Resumen concentra las cuatro cifras
y el único gráfico. Mes actual inicial, flechas sin avanzar a períodos futuros;
semana/año/rango conservados en «Otros períodos» por RF-16/CU-13 y RF-21. RF-19
mantiene la consulta conjunta plegada y acceso a Operaciones. Inventario siempre
actual. Finanzas deja el menú y redirige tras autorizar, sin cambios al shell
lateral, servicios, dinero ni fuentes. Evidencia focalizada en FINANZAS.md;
aceptación visual pendiente. Las descripciones previas de dos pantallas y mes
fijo en Dashboard quedan sustituidas por esta decisión. SRS/RUP solo leídos.
