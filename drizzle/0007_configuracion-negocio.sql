CREATE TABLE "configuracion_negocio" (
	"id" smallint PRIMARY KEY NOT NULL,
	"direccion" text NOT NULL,
	"localidad" text NOT NULL,
	"provincia" text NOT NULL,
	"referencia" text NOT NULL,
	"dias_atencion" text[] NOT NULL,
	"apertura" text NOT NULL,
	"cierre" text NOT NULL,
	"como_llegar" text NOT NULL,
	"telefono_whatsapp" text NOT NULL,
	"usuario_instagram" text NOT NULL,
	CONSTRAINT "configuracion_negocio_id_unico" CHECK ("configuracion_negocio"."id" = 1)
);
--> statement-breakpoint
INSERT INTO "configuracion_negocio" (
  "id", "direccion", "localidad", "provincia", "referencia", "dias_atencion",
  "apertura", "cierre", "como_llegar", "telefono_whatsapp", "usuario_instagram"
) VALUES (
  1, 'Entre Ríos 924', 'Concordia', 'Entre Ríos', 'Planta baja, detrás de las escaleras',
  ARRAY['lunes', 'martes', 'miercoles', 'jueves', 'viernes'],
  '17:00', '21:00', 'https://maps.app.goo.gl/xch8vm33VuDuykjw9', '5493454266760', 'angeltears.ac'
) ON CONFLICT ("id") DO NOTHING;
