# Checklist de reunión comercial

Material de trabajo. Las altas, pagos, migraciones y despliegues quedan para una ejecución posterior autorizada. La [guía comercial](DESPLIEGUE_COMERCIAL.md) contiene el procedimiento completo.

## Sofía

- [ ] Confirmar el correo de la administradora, titularidad de las cuentas, MFA y recuperación, dominio deseado y presupuesto. Las autorizaciones, pagos y contraseñas se hacen desde su sesión.
- [ ] Facilitar el hero y la foto del interior autorizados. Confirmar derechos de las historias y fotos publicadas, y aprobar dirección, horarios, mapa y canales. Elegir catálogo nuevo o lista de productos a conservar.
- [ ] Confirmar los datos de [privacidad y atención al consumidor](PRIVACIDAD_Y_CONSUMO.md) y revisar con la contadora los precios, datos fiscales y comprobantes. WhatsApp e Instagram son para consultas y la compra se concreta en el local. Confirmar si hay entregas después de una compra presencial.

## Desarrollador

- [ ] Revisar el encuadre de las fotos en escritorio y móvil, completar los avisos aprobados y fijar el SHA. Verificar el bundle y separar los disparadores de Vercel antes de sincronizar el repositorio. Confirmar que la demo sigue disponible y con `noindex`.
- [ ] Seguir el [orden de instalación](DESPLIEGUE_COMERCIAL.md#secuencia-de-instalación) y la [tabla de variables](DESPLIEGUE_COMERCIAL.md#variables-del-servicio). Identificar Neon comercial, aprovisionar la cuenta, preparar medios y correo, y configurar Railway, DNS y HTTPS. Mantener `SITE_URL` sin definir hasta aprobar la apertura.
- [ ] Si se elige conservar productos, documentar la selección, el stock real y los originales autorizados antes de copiar. Usar el [procedimiento selectivo](DESPLIEGUE_COMERCIAL.md#opción-b-copia-selectiva-de-productos).
- [ ] Recorrer la [aceptación en el dominio comercial](DESPLIEGUE_COMERCIAL.md#4-https-aceptación-y-entrega) con Sofía. Confirmar login, cambio y recuperación de contraseña, publicación de una ficha, respaldo restaurado y recepción de [alertas](DESPLIEGUE_COMERCIAL.md#alertas-para-configurar-al-desplegar). Dejar anotado el contacto de ayuda técnica. Activar SEO después de la aprobación.

## SEO de esta etapa

Usar Catálogo como página agrupadora. Conservar los enlaces rastreables desde Inicio a Catálogo y destacados, y desde fichas a relacionados y al catálogo. Mantener un H1 claro por página y H2/H3 por sección. Priorizar fichas con fotos autorizadas, material, medidas y cuidados reales. Mantener el nombre, la dirección y el horario de Concordia consistentes con Google Business Profile si Sofía lo gestiona. Evaluar una página para una categoría solo si reúne una oferta estable y contenido propio que ayude a comprar. Las variantes de filtros, los hubs vacíos, las traducciones masivas, los artículos de relleno y `hreflang` para un único sitio en español quedan fuera. [Estructura y enlaces](https://developers.google.com/search/docs/specialty/ecommerce/help-google-understand-your-ecommerce-site-structure) · [Versiones por idioma](https://developers.google.com/search/docs/specialty/international/localized-versions)
