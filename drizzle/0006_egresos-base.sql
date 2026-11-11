CREATE TABLE "egreso" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"concepto" text NOT NULL,
	"importe" numeric(18, 2) NOT NULL,
	"fecha_operacion" date NOT NULL,
	"nota" text,
	"estado" text DEFAULT 'CONFIRMADO' NOT NULL,
	"actor_id" text NOT NULL,
	"clave_solicitud" uuid NOT NULL,
	"huella" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"anulado_en" timestamp with time zone,
	"anulado_por_id" text,
	CONSTRAINT "egreso_clave_solicitud_unica" UNIQUE("clave_solicitud"),
	CONSTRAINT "egreso_concepto_requerido" CHECK (length(btrim("egreso"."concepto")) > 0),
	CONSTRAINT "egreso_nota_no_vacia" CHECK ("egreso"."nota" IS NULL OR length(btrim("egreso"."nota")) > 0),
	CONSTRAINT "egreso_importe_valido" CHECK ("egreso"."importe" > 0 AND "egreso"."importe"::text NOT IN ('NaN', 'Infinity', '-Infinity')),
	CONSTRAINT "egreso_estado_valido" CHECK ("egreso"."estado" IN ('CONFIRMADO', 'ANULADO')),
	CONSTRAINT "egreso_anulacion_coherente" CHECK (("egreso"."estado" = 'CONFIRMADO' AND "egreso"."anulado_en" IS NULL AND "egreso"."anulado_por_id" IS NULL)
    OR ("egreso"."estado" = 'ANULADO' AND "egreso"."anulado_en" IS NOT NULL AND "egreso"."anulado_por_id" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "egreso" ADD CONSTRAINT "egreso_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "egreso" ADD CONSTRAINT "egreso_anulado_por_id_user_id_fk" FOREIGN KEY ("anulado_por_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "egreso_estado_fecha_id" ON "egreso" USING btree ("estado","fecha_operacion","id");