# Privacidad y atención al consumidor

Borrador interno para revisar con Sofía. Los campos entre corchetes requieren confirmación antes de publicar. Angel Tears muestra el catálogo y recibe consultas. Todas las ventas se acuerdan y concretan presencialmente en el local.

## Privacidad y cookies

- **Sitio público.** El sitio público no tiene registro de visitantes, formularios, checkout, pagos web, gestión de pedidos ni suscripciones. El código no integra analítica, Meta Pixel, Google Analytics ni almacenamiento de seguimiento. Inicio, Catálogo, ficha y login en visita anónima no devolvieron `Set-Cookie` en la muestra de la demo. Cloudinary entrega imágenes y recibe datos técnicos de las solicitudes. WhatsApp, Instagram y Google Maps son enlaces externos. Al abrir WhatsApp desde una ficha, su URL lleva el nombre y el enlace del producto en un mensaje sugerido. El envío del mensaje depende de la persona.
- **Panel y operaciones.** Better Auth usa cookies técnicas para la sesión y el flujo de autenticación. PostgreSQL almacena nombre y correo de la administradora, credencial hasheada, y datos de sesión como IP y agente de usuario cuando están disponibles. En el panel pueden registrarse datos de compradores y proveedores, y notas de operaciones. Estos datos quedan en el área privada. La recuperación envía a Resend el correo administrativo y un enlace de un solo uso.
- **Proveedores y registros.** El alojamiento y el CDN pueden guardar IP, ruta, horarios de acceso y datos técnicos según sus ajustes. El código de recuperación y Auth reduce los detalles que registra. Confirmar en el entorno final qué queda en los logs de acceso, en particular las URLs con tokens, sus plazos y quién puede consultarlos. Confirmar también regiones, transferencias internacionales y garantías de Railway, Neon, Cloudinary, Resend y cualquier servicio añadido. [Ley 25.326](https://www.argentina.gob.ar/normativa/nacional/ley-25326-64790/actualizacion) · [AAIP sobre transferencias](https://www.argentina.gob.ar/transferencias-internacionales)
- **Consentimiento.** Con los usos revisados no se justifica agregar un banner de consentimiento. Explicar las cookies técnicas del panel en el aviso. Repetir la comprobación en el dominio comercial con una sesión anónima y otra administrativa, incluidos los ajustes del alojamiento y CDN. Si se agrega seguimiento, evaluar su base legal y el consentimiento antes de habilitarlo.

### Texto breve propuesto

**Responsable.** [Nombre o razón social y domicilio del responsable]. Podés contactarnos por [correo de privacidad].

**Qué usamos y para qué.** Podés navegar por el catálogo sin crear una cuenta. Si nos escribís por WhatsApp o Instagram, usamos los datos que compartas para responder a tu consulta. Las compras se concretan en el local y pueden quedar registradas en nuestra administración. El sitio y el servicio de imágenes reciben datos técnicos de conexión para su funcionamiento y seguridad. Los servicios externos aplican sus propias políticas cuando navegás por ellos.

**Cookies.** Usamos cookies técnicas de autenticación para ingresar y mantener una sesión segura en el panel administrativo. El catálogo no usa cookies propias de publicidad ni de analítica.

**Destinatarios y conservación.** [Confirmar prestadores, finalidades y transferencias, y plazos o criterios de conservación de chats, operaciones, archivos y logs]. Los datos requeridos dependen de la consulta o de la atención de una compra presencial. [Indicar qué datos son obligatorios y qué pasa si no se aportan, al momento de solicitarlos].

**Tus derechos.** Podés pedir acceso, rectificación, actualización o supresión cuando corresponda a [correo de privacidad]. La Agencia de Acceso a la Información Pública (AAIP) recibe reclamos sobre protección de datos personales. [Derechos y reclamos ante la AAIP](https://www.argentina.gob.ar/aaip/datospersonales/derechos)

Antes de publicar, confirmar con Sofía el responsable y su domicilio, el correo monitoreado, quién accede a los chats y registros, qué datos se piden, los plazos reales y si corresponde inscribir las bases. Revisar con asesoramiento el mecanismo aplicable a las transferencias internacionales.

## Aviso comercial propuesto

> Este sitio es un catálogo de Angel Tears. Podés consultar disponibilidad por WhatsApp o Instagram. Las compras se acuerdan y concretan en el local. Para consultas o reclamos, contactanos por [canal y horario de atención]. Nos encontrás en [dirección comercial confirmada].

Confirmar quién vende, los datos fiscales que corresponda exhibir, la dirección, los horarios, los medios de pago, los comprobantes y cualquier condición de entrega posterior a la compra presencial. Coordinar con la contadora la exhibición del precio final y del importe «PRECIO SIN IMPUESTOS NACIONALES» según el régimen aplicable, y confirmar si corresponde mostrar el Formulario 960/D de ARCA. El catálogo hoy muestra un solo importe. [Ley 24.240](https://www.argentina.gob.ar/normativa/nacional/638/actualizacion) · [Resolución 4/2025](https://www.argentina.gob.ar/normativa/nacional/resoluci%C3%B3n-4-2025-408455/texto) · [ARCA](https://arca.gob.ar/960/formulario-960/obligados.asp)
