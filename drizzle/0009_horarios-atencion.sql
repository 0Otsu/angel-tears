ALTER TABLE "configuracion_negocio" ADD COLUMN "horarios" jsonb;
--> statement-breakpoint
UPDATE "configuracion_negocio" AS negocio
SET "horarios" = (
  SELECT jsonb_object_agg(dia, CASE
    WHEN dia = ANY (negocio."dias_atencion")
      THEN jsonb_build_array(jsonb_build_object('apertura', negocio."apertura", 'cierre', negocio."cierre"))
    ELSE '[]'::jsonb
  END)
  FROM unnest(ARRAY['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']) AS semana(dia)
);
--> statement-breakpoint
ALTER TABLE "configuracion_negocio" ALTER COLUMN "horarios" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "configuracion_negocio"
  DROP COLUMN "dias_atencion",
  DROP COLUMN "apertura",
  DROP COLUMN "cierre";
