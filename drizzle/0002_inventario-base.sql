CREATE TABLE "ajuste_stock" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"producto_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"cantidad" integer NOT NULL,
	"motivo" text NOT NULL,
	"actor_id" text NOT NULL,
	"clave_solicitud" uuid NOT NULL,
	"huella" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ajuste_stock_clave_solicitud_unica" UNIQUE("clave_solicitud"),
	CONSTRAINT "ajuste_stock_tipo_valido" CHECK ("ajuste_stock"."tipo" IN ('INICIAL', 'INCREMENTO', 'DECREMENTO')),
	CONSTRAINT "ajuste_stock_cantidad_positiva" CHECK ("ajuste_stock"."cantidad" > 0),
	CONSTRAINT "ajuste_stock_motivo_requerido" CHECK (length(btrim("ajuste_stock"."motivo")) > 0)
);
--> statement-breakpoint
CREATE TABLE "inventario" (
	"producto_id" uuid PRIMARY KEY NOT NULL,
	"cantidad" integer DEFAULT 0 NOT NULL,
	"minimo" integer,
	"version" integer DEFAULT 1 NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventario_cantidad_no_negativa" CHECK ("inventario"."cantidad" >= 0),
	CONSTRAINT "inventario_minimo_no_negativo" CHECK ("inventario"."minimo" IS NULL OR "inventario"."minimo" >= 0)
);
--> statement-breakpoint
CREATE TABLE "movimiento_stock" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"producto_id" uuid NOT NULL,
	"delta" integer NOT NULL,
	"saldo_resultante" integer NOT NULL,
	"actor_id" text NOT NULL,
	"tipo" text DEFAULT 'ORIGINAL' NOT NULL,
	"ajuste_id" uuid,
	"reversa_de" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "movimiento_stock_reversa_de_unica" UNIQUE("reversa_de"),
	CONSTRAINT "movimiento_stock_delta_no_cero" CHECK ("movimiento_stock"."delta" <> 0),
	CONSTRAINT "movimiento_stock_saldo_no_negativo" CHECK ("movimiento_stock"."saldo_resultante" >= 0),
	CONSTRAINT "movimiento_stock_tipo_valido" CHECK ("movimiento_stock"."tipo" IN ('ORIGINAL', 'REVERSA')),
	CONSTRAINT "movimiento_stock_origen_unico" CHECK (num_nonnulls("movimiento_stock"."ajuste_id") = 1),
	CONSTRAINT "movimiento_stock_reversa_coherente" CHECK (("movimiento_stock"."tipo" = 'REVERSA') = ("movimiento_stock"."reversa_de" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "ajuste_stock" ADD CONSTRAINT "ajuste_stock_producto_id_producto_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."producto"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ajuste_stock" ADD CONSTRAINT "ajuste_stock_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventario" ADD CONSTRAINT "inventario_producto_id_producto_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."producto"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimiento_stock" ADD CONSTRAINT "movimiento_stock_producto_id_producto_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."producto"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimiento_stock" ADD CONSTRAINT "movimiento_stock_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimiento_stock" ADD CONSTRAINT "movimiento_stock_ajuste_id_ajuste_stock_id_fk" FOREIGN KEY ("ajuste_id") REFERENCES "public"."ajuste_stock"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimiento_stock" ADD CONSTRAINT "movimiento_stock_reversa_de_movimiento_stock_id_fk" FOREIGN KEY ("reversa_de") REFERENCES "public"."movimiento_stock"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ajuste_stock_producto_creado_id" ON "ajuste_stock" USING btree ("producto_id","creado_en","id");--> statement-breakpoint
CREATE INDEX "movimiento_stock_producto_creado_id" ON "movimiento_stock" USING btree ("producto_id","creado_en","id");--> statement-breakpoint
CREATE UNIQUE INDEX "movimiento_stock_ajuste_tipo_unico" ON "movimiento_stock" USING btree ("ajuste_id","tipo") WHERE "movimiento_stock"."ajuste_id" IS NOT NULL;