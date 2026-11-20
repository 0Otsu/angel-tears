# Checklist de reunión comercial

Material de trabajo. Las altas, pagos, migraciones y despliegues quedan para una ejecución posterior autorizada. La [guía comercial](DESPLIEGUE_COMERCIAL.md) contiene el procedimiento completo.

## Sofía

- [ ] Definir si WhatsApp e Instagram solo reciben consultas o si allí se confirma la venta. Si se concreta a distancia, acordar quién atiende arrepentimientos y reclamos, cómo se registran y quién responde dentro de 24 horas.
- [ ] Confirmar con su contadora los datos del vendedor, los importes a exhibir y Data Fiscal. Acordar pagos, entrega/retiro, costos, garantía y comprobantes. Completar el [borrador de privacidad y atención al consumidor](PRIVACIDAD_Y_CONSUMO.md) y validar dónde se publicará.
- [ ] Confirmar dominio, correo que controla, recuperación de cuentas y presupuesto. Aprobar dirección, horarios, canales, fotos de productos y el hero. La foto propia de la fachada puede llegar después. Confirmar permiso para publicar las historias y fotos aportadas.

## Desarrollador

- [ ] Fijar el SHA aprobado. Antes de sincronizar, confirmar un bundle privado recuperable y registrar el deployment activo de la demo. Con autorización posterior, separar la integración Git de Vercel y revisar deploy hooks y otros disparadores. Verificar que la URL de demo siga funcionando. Después comparar `origin/main` con `main`, publicar solo el avance lineal autorizado y comprobar SHA remoto y deployment activo. Si no se puede verificar la separación, mantener GitHub intacto.
- [ ] Preparar Railway y una base Neon comercial separada. Revisar los destinos y aplicar las migraciones `0000`–`0008`, categorías iniciales y cuenta única. Confirmar backups cifrados, restauración aislada, alertas y responsable de seguimiento.
- [ ] Completar y validar los avisos comerciales y de privacidad en el sitio antes de abrirlo. Confirmar los ajustes de logs, conservación y regiones de los proveedores. Dejar la demo con `noindex`.

## Accesos y configuración para la instalación

- [ ] Sofía controla las cuentas y conserva MFA y recuperación en su gestor. Ingresar credenciales fuera del chat y compartir por invitación nominal cuando sea posible.
- [ ] **Neon y Railway.** Conexión de mantenimiento directa, rol de aplicación y su `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`. Acordar TLS y origen. Configurar `BETTER_AUTH_TRUSTED_IP_HEADER` solo tras verificar el proxy. Mantener `SITE_URL` sin definir hasta aprobar la apertura.
- [ ] **Cloudinary y Resend.** Cuenta, credenciales del servidor y carpeta de imágenes. Clave de correo, remitente verificado y DNS de autenticación. Acordar dónde se guardarán las fotos originales.
- [ ] **Dominio y DNS.** Confirmar acceso a NIC Argentina y gestión DNS, HTTPS y una sola URL pública. Preparar la verificación de Search Console para después de aprobar el lanzamiento.

## Pruebas de aceptación antes de anunciar la URL

- [ ] Inicio y Catálogo en móvil y escritorio. Publicar una ficha real con imagen, precio y stock inicial. Probar filtros, «Cómo llegar» y mensaje de WhatsApp con enlace al producto. Confirmar precios y datos visibles.
- [ ] Sofía entra desde una sesión nueva y valida la recuperación real de contraseña y la revocación de la sesión anterior. Revisar cookies de visitante y del panel, recepción de correo y ausencia de tokens en logs.
- [ ] Verificar lectura de datos, carga de imágenes, copia restaurada y alerta operativa. Si se vende a distancia, recorrer la solicitud de arrepentimiento y la respuesta con código.
- [ ] Activar `SITE_URL` solo en el dominio comercial aprobado. Comprobar canonical, robots, sitemap, LocalBusiness y Search Console. Volver a comprobar `noindex` en la demo.

## SEO de esta etapa

Usar Catálogo como página agrupadora. Conservar los enlaces rastreables desde Inicio a Catálogo y destacados, y desde fichas a relacionados y al catálogo. Mantener un H1 claro por página y H2/H3 por sección. Priorizar fichas con fotos autorizadas, material, medidas y cuidados reales. Mantener el nombre, la dirección y el horario de Concordia consistentes con Google Business Profile si Sofía lo gestiona. Evaluar una página para una categoría solo si reúne una oferta estable y contenido propio que ayude a comprar. Las variantes de filtros, los hubs vacíos, las traducciones masivas, los artículos de relleno y `hreflang` para un único sitio en español quedan fuera. [Estructura y enlaces](https://developers.google.com/search/docs/specialty/ecommerce/help-google-understand-your-ecommerce-site-structure) · [Versiones por idioma](https://developers.google.com/search/docs/specialty/international/localized-versions)
