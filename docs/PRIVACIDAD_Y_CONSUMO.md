# Privacidad y atención al consumidor

Borradores para revisar con Sofía antes de publicar. Los campos entre corchetes requieren confirmación. La revisión se hizo sobre el código y la demo del 20/11/2026. La configuración comercial y la aplicación de las normas al flujo de venta requieren validación final.

## Privacidad y cookies

- **Sitio público.** No hay registro de visitantes, formulario público, carrito, pagos web ni suscripción. El código no integra analítica, Meta Pixel, Google Analytics ni almacenamiento de seguimiento. Inicio, Catálogo, ficha y login en visita anónima no devolvieron `Set-Cookie` en la muestra de la demo. Cloudinary entrega imágenes y recibe datos técnicos de las solicitudes. WhatsApp, Instagram y Google Maps son enlaces externos. Al abrir WhatsApp desde una ficha, su URL lleva el nombre y el enlace del producto en un mensaje sugerido. El envío del mensaje depende de la persona.
- **Panel y operaciones.** Better Auth usa cookies técnicas para la sesión y el flujo de autenticación. PostgreSQL almacena nombre y correo de la administradora, credencial hasheada, y datos de sesión como IP y agente de usuario cuando están disponibles. En el panel pueden registrarse datos de compradores y proveedores, y notas de operaciones. Estos datos quedan en el área privada. La recuperación envía a Resend el correo administrativo y un enlace de un solo uso.
- **Proveedores y registros.** El alojamiento y el CDN pueden guardar IP, ruta, horarios de acceso y datos técnicos según sus ajustes. El código de recuperación y Auth reduce los detalles que registra. Confirmar en el entorno final qué queda en los logs de acceso, en particular las URLs con tokens, sus plazos y quién puede consultarlos. Confirmar también regiones, transferencias internacionales y garantías de Railway, Neon, Cloudinary, Resend y cualquier servicio añadido. [Ley 25.326](https://www.argentina.gob.ar/normativa/nacional/ley-25326-64790/actualizacion) · [AAIP sobre transferencias](https://www.argentina.gob.ar/transferencias-internacionales)
- **Consentimiento.** Con los usos revisados no se justifica agregar un banner de consentimiento. Explicar las cookies técnicas del panel en el aviso. Repetir la comprobación en el dominio comercial con una sesión anónima y otra administrativa, incluidos los ajustes del alojamiento y CDN. Si se agrega seguimiento, evaluar su base legal y el consentimiento antes de habilitarlo.

### Texto breve propuesto

**Responsable.** [Nombre o razón social y domicilio del responsable]. Podés contactarnos por [correo de privacidad].

**Qué usamos y para qué.** Podés navegar por el catálogo sin crear una cuenta. Si nos escribís por WhatsApp o Instagram, usamos los datos que compartas para responder y, si corresponde, gestionar la compra, su entrega y la atención posterior. La compra puede quedar registrada en nuestra administración. El sitio y el servicio de imágenes reciben datos técnicos de conexión para su funcionamiento y seguridad. Los servicios externos aplican sus propias políticas cuando navegás por ellos.

**Cookies.** Usamos cookies técnicas de autenticación para ingresar y mantener una sesión segura en el panel administrativo. El catálogo no usa cookies propias de publicidad ni de analítica.

**Destinatarios y conservación.** [Confirmar prestadores, finalidades y transferencias, y plazos o criterios de conservación de chats, operaciones, archivos y logs]. Los datos requeridos para responder o gestionar una compra dependen de la consulta y del medio de entrega. [Indicar qué datos son obligatorios y qué pasa si no se aportan, al momento de solicitarlos].

**Tus derechos.** Podés pedir acceso, rectificación, actualización o supresión cuando corresponda a [correo de privacidad]. La Agencia de Acceso a la Información Pública (AAIP) recibe reclamos sobre protección de datos personales. [Derechos y reclamos ante la AAIP](https://www.argentina.gob.ar/aaip/datospersonales/derechos)

Antes de publicar, confirmar con Sofía el responsable y su domicilio, el correo monitoreado, quién accede a los chats y registros, qué datos se piden, los plazos reales y si corresponde inscribir las bases. Revisar con asesoramiento el mecanismo aplicable a las transferencias internacionales.

## Información comercial y ventas por WhatsApp

El catálogo muestra precios en pesos y disponibilidad. Inicio muestra dirección, horario, canales de contacto y una indicación general sobre pagos y envíos. Falta confirmar quién vende legalmente, CUIT, domicilio y correo de atención, horarios de reclamos, medios de pago efectivos, costo y plazo de envío o retiro, condiciones de garantía/devolución y comprobante. Si se vende por chat, informar los datos del proveedor y las condiciones antes de la aceptación, y enviar confirmación escrita de la operación. [Ley 24.240](https://www.argentina.gob.ar/normativa/nacional/638/actualizacion) · [Resolución 270/2020](https://www.argentina.gob.ar/normativa/nacional/resoluci%C3%B3n-270-2020-341933/texto)

El sitio ahora muestra un solo importe. Antes de publicar precios comerciales, validar con la contadora cómo calcular y exhibir el precio final y el importe «PRECIO SIN IMPUESTOS NACIONALES» conforme al régimen fiscal de Sofía. La guía oficial incluye las páginas web. Consultar si corresponde exhibir el Formulario 960/D de ARCA en Inicio. [Resolución 4/2025](https://www.argentina.gob.ar/normativa/nacional/resoluci%C3%B3n-4-2025-408455/texto) · [Preguntas frecuentes oficiales](https://www.argentina.gob.ar/sites/default/files/2025/04/preguntas_frecuentes_exhibicion_de_precios.pdf) · [ARCA](https://arca.gob.ar/960/formulario-960/obligados.asp)

Si la aceptación de la compra ocurre por WhatsApp, hay contratación a distancia aunque el sitio carezca de checkout o la entrega sea en el local. El derecho de revocación es en general de **10 días corridos desde la contratación o la entrega, lo que ocurra después**. Informarlo por escrito antes de la compra. El proveedor asume el costo de devolución. Si WhatsApp se usa para consultas y la compra recién se celebra presencialmente, es un flujo distinto. Confirmar ambos recorridos y cualquier excepción con asesoramiento. [Ley 24.240, arts. 33 y 34](https://www.argentina.gob.ar/normativa/nacional/638/actualizacion) · [Código Civil y Comercial, arts. 1110 a 1116](https://www.argentina.gob.ar/normativa/nacional/235975/texto)

Para venta a distancia, preparar y validar un **Botón de arrepentimiento** visible desde el primer acceso, sin cuenta y separado de «Consultar». Definir un medio que reciba la solicitud y permita devolver por el mismo canal un código dentro de **24 horas**. Una verificación de identidad, si hace falta, debe ser razonable y por medios habituales. Confirmar si un enlace directo a un canal atendido satisface el flujo concreto. El botón y su operación quedan pendientes hasta definir la modalidad de venta. [Disposición 954/2025, arts. 1 y 5](https://www.argentina.gob.ar/normativa/nacional/disposici%C3%B3n-954-2025-417152/texto) · [Disposición 3/2026](https://www.boletinoficial.gob.ar/detalleAviso/primera/338248/20260206)

### Texto breve para la confirmación de una venta a distancia

> Vendido por [nombre o razón social, CUIT, domicilio y correo de atención]. Producto [detalle]. Precio final [importe en ARS] y envío [costo o retiro acordado]. Total [importe], pago [medio] y entrega [modalidad y plazo]. Comprobante [dato].
>
> Podés arrepentirte dentro de diez días corridos desde la compra o la entrega, lo que ocurra después. Solicitá la revocación mediante [enlace al Botón de arrepentimiento]. Te enviaremos un código por el mismo medio dentro de las 24 horas. El costo de devolución está a nuestro cargo. Para garantías y reclamos, contactanos en [canal y horario confirmados].

Usar este texto cuando el canal, la atención y las condiciones ya estén definidos. Mantener disponibles los datos y derechos antes de que la persona confirme el pedido.
