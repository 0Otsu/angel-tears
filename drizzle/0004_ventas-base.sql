CREATE TABLE "venta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fecha_operacion" date NOT NULL,
	"comprador" text,
	"total" numeric(18, 2) NOT NULL,
	"estado" text DEFAULT 'CONFIRMADA' NOT NULL,
	"actor_id" text NOT NULL,
	"clave_solicitud" uuid NOT NULL,
	"huella" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"anulado_en" timestamp with time zone,
	"anulado_por_id" text,
	CONSTRAINT "venta_clave_solicitud_unica" UNIQUE("clave_solicitud"),
	CONSTRAINT "venta_estado_valido" CHECK ("venta"."estado" IN ('CONFIRMADA', 'ANULADA')),
	CONSTRAINT "venta_anulacion_coherente" CHECK (("venta"."estado" = 'ANULADA' AND "venta"."anulado_en" IS NOT NULL AND "venta"."anulado_por_id" IS NOT NULL)
        OR ("venta"."estado" = 'CONFIRMADA' AND "venta"."anulado_en" IS NULL AND "venta"."anulado_por_id" IS NULL)),
	CONSTRAINT "venta_comprador_no_vacio" CHECK ("venta"."comprador" IS NULL OR length(btrim("venta"."comprador")) > 0),
	CONSTRAINT "venta_total_valido" CHECK ("venta"."total" >= 0 AND "venta"."total"::text NOT IN ('NaN', 'Infinity', '-Infinity'))
);
--> statement-breakpoint
CREATE TABLE "venta_linea" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venta_id" uuid NOT NULL,
	"numero_linea" integer NOT NULL,
	"producto_id" uuid NOT NULL,
	"nombre_producto_historico" text NOT NULL,
	"cantidad" integer NOT NULL,
	"precio_unitario_historico" numeric(18, 2) NOT NULL,
	"subtotal" numeric(18, 2) NOT NULL,
	CONSTRAINT "venta_linea_venta_numero_unico" UNIQUE("venta_id","numero_linea"),
	CONSTRAINT "venta_linea_numero_positivo" CHECK ("venta_linea"."numero_linea" > 0),
	CONSTRAINT "venta_linea_cantidad_positiva" CHECK ("venta_linea"."cantidad" > 0),
	CONSTRAINT "venta_linea_nombre_requerido" CHECK (length(btrim("venta_linea"."nombre_producto_historico")) > 0),
	CONSTRAINT "venta_linea_precio_valido" CHECK ("venta_linea"."precio_unitario_historico" >= 0 AND "venta_linea"."precio_unitario_historico"::text NOT IN ('NaN', 'Infinity', '-Infinity')),
	CONSTRAINT "venta_linea_subtotal_exacto" CHECK ("venta_linea"."subtotal" = "venta_linea"."cantidad" * "venta_linea"."precio_unitario_historico")
);
--> statement-breakpoint
ALTER TABLE "movimiento_stock" DROP CONSTRAINT "movimiento_stock_origen_unico";--> statement-breakpoint
ALTER TABLE "movimiento_stock" ADD COLUMN "venta_linea_id" uuid;--> statement-breakpoint
ALTER TABLE "venta" ADD CONSTRAINT "venta_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venta" ADD CONSTRAINT "venta_anulado_por_id_user_id_fk" FOREIGN KEY ("anulado_por_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venta_linea" ADD CONSTRAINT "venta_linea_venta_id_venta_id_fk" FOREIGN KEY ("venta_id") REFERENCES "public"."venta"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venta_linea" ADD CONSTRAINT "venta_linea_producto_id_producto_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."producto"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "venta_estado_fecha_id" ON "venta" USING btree ("estado","fecha_operacion","id");--> statement-breakpoint
CREATE INDEX "venta_linea_producto" ON "venta_linea" USING btree ("producto_id");--> statement-breakpoint
ALTER TABLE "movimiento_stock" ADD CONSTRAINT "movimiento_stock_venta_linea_id_venta_linea_id_fk" FOREIGN KEY ("venta_linea_id") REFERENCES "public"."venta_linea"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "movimiento_stock_venta_linea_tipo_unico" ON "movimiento_stock" USING btree ("venta_linea_id","tipo") WHERE "movimiento_stock"."venta_linea_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "movimiento_stock" ADD CONSTRAINT "movimiento_stock_origen_unico" CHECK (num_nonnulls("movimiento_stock"."ajuste_id", "movimiento_stock"."venta_linea_id") = 1);