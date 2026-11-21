# Configuración del negocio

## Alcance

La tarea de cierre comercial del 19/11/2026 autoriza editar en el panel la dirección, referencia, horarios, Google Maps, WhatsApp e Instagram. Actualiza el alcance de edición de la decisión M4 para estos campos. La SRS y los casos de uso canónicos siguen pendientes de formalización. El tema administrativo queda fuera de esta entrega.

En el menú de usuario, abrí **Configuración del negocio**. Se puede editar la calle y el número, localidad y provincia dentro de Argentina. Cada día puede quedar cerrado o tener hasta dos franjas de apertura y cierre. Las franjas pueden ser consecutivas. Si comparten minutos, se rechaza el guardado. El botón **Aplicar este horario de lunes a viernes** copia las franjas abiertas al borrador de esos cinco días. La referencia puede quedar vacía.

## Persistencia y publicación

La migración `0007_configuracion-negocio` crea una tabla limitada a la fila `id = 1`. Inicializa los datos confirmados con `ON CONFLICT DO NOTHING` para preservar una configuración existente. La migración `0009_horarios-atencion` convierte cada día que estaba abierto en una franja con sus horas anteriores. Los demás días quedan cerrados. La columna `horarios` usa JSONB con una clave por día y una lista de pares `{ apertura, cierre }` en formato `HH:mm`. Se validan los campos en el servidor y se guarda toda la semana en una única operación de PostgreSQL.

La lectura pública comparte una proyección de los campos editables y se memoriza solo por solicitud. El guardado invalida las rutas públicas afectadas. Cuando una lectura falla, la página puede seguir mostrando su contenido y omite contactos y horarios que no pudo confirmar. Los datos de `LocalBusiness` se generan a partir de la misma proyección y usan el serializador JSON-LD existente.

La sección del local muestra la dirección, agrupa los días que tienen las mismas franjas y conserva el enlace «Cómo llegar». Acepta una fotografía propia autorizada como recurso estático. Editar la dirección actualiza el texto y el enlace configurado. El área de envíos conserva su política independiente.

## Validación manual

1. Usá un entorno local de revisión autorizado que tenga la migración aplicada y una cuenta de administración. Abrí **Menú de usuario → Configuración del negocio** y comprobá los datos iniciales.
2. Editá un día, agregá una segunda franja e intentá guardar con un solapamiento o con el cierre antes de la apertura. Corregí el error sin volver a cargar los datos. Probá copiar el horario de lunes a viernes y marcar un día del fin de semana como cerrado.
3. Guardá valores de prueba válidos. Reabrí Configuración para comprobar la persistencia. Revisá Inicio, Catálogo y una ficha publicada. Comprobá dirección, días y horas, «Cómo llegar», contactos y número de WhatsApp en el mensaje.
4. Revisá el JSON-LD del Inicio y confirmá que incluya la dirección, teléfono y horarios vigentes. Sin sesión, la ruta de administración debe redirigir al login.

La migración de esta tarea se verificó en PostgreSQL local aislado de pruebas. Su aplicación en una base compartida o en otro entorno requiere autorización específica.
