# Feedback de interacciones existentes

## Fuente, objetivo y limites

Pedido transversal del responsable del 01/11/2026, posterior a Producto 2.5 y su polish. Base `ddc4f505e3ae1b2a78291d6208ab102136122080`, rama `fix/feedback-interacciones`. Mejora de presentacion de recorridos ya aceptados; sin RF/CU nuevos ni cambios a reglas de Producto/Auth. Las referencias funcionales siguen siendo las de cada feature vigente; CU exactos pendientes de formalizacion RUP. No modifica servidor, permisos, contratos, persistencia, Cloudinary, migraciones ni dependencias.

## Inspeccion y patron elegido

Button existente usa Slot/asChild y estilos compartidos; no se cambia su semantica ni se insertan hijos que rompan Slot. Los formularios actuales usan onSubmit con estado propio o useTransition, no form actions declarativas: se conservan esos mecanismos, sin superponer useFormStatus. No habia loading.tsx en Productos. Stock/Proveedores y Compras/Ventas/Egresos siguen siendo vistas demo, aunque Inventario tenga servicios persistidos internos: no existen comandos reales conectados a esas vistas para mostrarles progreso.

- `Spinner`: icono pequeno de color heredado, aria-hidden y motion-reduce:animate-none.
- `PendingButton`: compone Button, recibe pending/pendingLabel del propietario real; disabled y aria-busy, spinner mas texto. Sin estado/timer propio, sin cambiar validacion, guard o manejo de errores.
- `NavigationButton`: CTA explicito que usa router.push dentro de useTransition; texto Cargando mientras React/Next mantiene pendiente la navegacion, bloqueo del segundo click y recuperacion al finalizar. Boton real con teclado/foco de Button; los enlaces secundarios conservan su semantica y no se convierten masivamente.
- `productos/loading.tsx`: fallback local de consulta/navegacion con texto y spinner discreto, sin overlay global, tiempo minimo ni retrasos artificiales.

## Aplicacion y criterios verificables

- [x] Nuevo producto (cabecera y empty state): feedback inmediato de navegacion, ruta dedicada conservada.
- [x] Guardar datos/continuar y editar: pending existente con Guardando y spinner, sin segundo submit.
- [x] Publicar, ocultar, destacar/quitar destacado: copy especifico y spinner del boton/fila afectada; otras filas disponibles. Menu Editar/Cambiar imagen informa Abriendo edicion/imagen durante la transicion; cambiar una seccion ya montada es inmediato y no inventa espera.
- [x] Login, recovery, restablecer/cambiar contrasena y retry de cierre de otras sesiones: estado real existente con texto contextual/spinner. Login/logout y salida por sesion vencida mantienen feedback durante la transicion posterior a la respuesta, sin modificar el servicio Auth ni su matriz de errores.
- [x] Logout: Cerrando sesion, icono de espera, bloqueo y error conservado si el servidor no confirma.
- [x] Retry de consulta administrativa usa transicion; retry publico de error mantiene Reintentando hasta la recarga real del documento.
- [x] Uploader conserva sus fases/progreso real: no se cambia ni se agregan spinners encima de su barra.

Sin loaders en filtros locales, Continuar al resumen o cambios instantaneos de seccion; no hay solicitud que esperar. Links de navegacion secundaria/publica permanecen normales. No se agregan falsas operaciones a vistas demo ni loaders globales. La confirmacion temporal de cancelar conserva sus cinco segundos: es duracion de un aviso, no simulacion de una operacion.

## Pruebas y evidencia

341 unitarias/componentes correctas. Pruebas del patron cubren texto/aria-busy/spinner/disabled, click bloqueado, recuperacion despues de error y transicion retenida hasta completarse. Regresion de publicacion prueba una fila bloqueada, otra disponible, no duplicacion y recuperacion tras error. Los tests de Auth conservan errores/foco/seguridad; el selector del CTA cambia de link a button y ahora comprueba la navegacion invocada en vez de solamente href.

54 E2E existentes de Auth/Cuenta/recovery, Productos/imagen y publico/SEO correctos. Corrida adicional de los seis E2E administrativos con capturas: login, CTA Nuevo producto, guardado y publicacion desde menu; desktop/notebook/mobile. El navegador de prueba retiene respuestas REALES para inspeccionar pending y luego las libera, sin timers en la aplicacion ni respuestas de exito simuladas. PostgreSQL aislado `_test`, cuentas/productos descartables y limpieza del arnes existente; no se usan credenciales Cloudinary reales.

Capturas locales en `work/feedback-capturas/feedback-{login,navegacion,guardar}-{desktop,notebook,mobile}.png` y `feedback-publicar-desktop.png`, conservadas fuera de Git. Se revisan copy, spinner, composicion y ausencia de cambios globales de identidad. No equivale a certificacion WCAG ni medicion de rendimiento productiva.

Lint/typecheck/build (produccion en el arnes E2E), DB check/generate sin cambios, OpenSpec strict/doctor y diff-check correctos. No se repite la suite SQL de servicios: no se modifican servicios ni consultas; los E2E ya verifican persistencia de los recorridos afectados. 4.4 permanece parcial y 5.x pendiente; este polish no reabre ni marca tareas de negocio de otros owners.
