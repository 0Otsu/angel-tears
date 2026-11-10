CREATE TABLE "compra" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fecha_operacion" date NOT NULL,
	"proveedor_id" uuid,
	"nombre_proveedor_historico" text,
	"nota" text,
	"total" numeric(18, 2) NOT NULL,
	"estado" text DEFAULT 'CONFIRMADA' NOT NULL,
	"actor_id" text NOT NULL,
	"clave_solicitud" uuid NOT NULL,
	"huella" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"anulado_en" timestamp with time zone,
	"anulado_por_id" text,
	CONSTRAINT "compra_clave_solicitud_unica" UNIQUE("clave_solicitud"),
	CONSTRAINT "compra_estado_valido" CHECK ("compra"."estado" IN ('CONFIRMADA', 'ANULADA')),
	CONSTRAINT "compra_anulacion_coherente" CHECK (("compra"."estado" = 'ANULADA' AND "compra"."anulado_en" IS NOT NULL AND "compra"."anulado_por_id" IS NOT NULL)
        OR ("compra"."estado" = 'CONFIRMADA' AND "compra"."anulado_en" IS NULL AND "compra"."anulado_por_id" IS NULL)),
	CONSTRAINT "compra_proveedor_coherente" CHECK (("compra"."proveedor_id" IS NULL) = ("compra"."nombre_proveedor_historico" IS NULL)),
	CONSTRAINT "compra_nota_no_vacia" CHECK ("compra"."nota" IS NULL OR length(btrim("compra"."nota")) > 0),
	CONSTRAINT "compra_total_valido" CHECK ("compra"."total" >= 0 AND "compra"."total"::text NOT IN ('NaN', 'Infinity', '-Infinity'))
);
--> statement-breakpoint
CREATE TABLE "compra_linea" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"compra_id" uuid NOT NULL,
	"numero_linea" integer NOT NULL,
	"producto_id" uuid NOT NULL,
	"nombre_producto_historico" text NOT NULL,
	"cantidad" integer NOT NULL,
	"costo_unitario_historico" numeric(18, 2) NOT NULL,
	"subtotal" numeric(18, 2) NOT NULL,
	CONSTRAINT "compra_linea_compra_numero_unico" UNIQUE("compra_id","numero_linea"),
	CONSTRAINT "compra_linea_numero_positivo" CHECK ("compra_linea"."numero_linea" > 0),
	CONSTRAINT "compra_linea_cantidad_positiva" CHECK ("compra_linea"."cantidad" > 0),
	CONSTRAINT "compra_linea_nombre_requerido" CHECK (length(btrim("compra_linea"."nombre_producto_historico")) > 0),
	CONSTRAINT "compra_linea_costo_valido" CHECK ("compra_linea"."costo_unitario_historico" >= 0 AND "compra_linea"."costo_unitario_historico"::text NOT IN ('NaN', 'Infinity', '-Infinity')),
	CONSTRAINT "compra_linea_subtotal_exacto" CHECK ("compra_linea"."subtotal" = "compra_linea"."cantidad" * "compra_linea"."costo_unitario_historico")
);
--> statement-breakpoint
ALTER TABLE "movimiento_stock" DROP CONSTRAINT "movimiento_stock_origen_unico";--> statement-breakpoint
ALTER TABLE "movimiento_stock" ADD COLUMN "compra_linea_id" uuid;--> statement-breakpoint
ALTER TABLE "compra" ADD CONSTRAINT "compra_proveedor_id_proveedor_id_fk" FOREIGN KEY ("proveedor_id") REFERENCES "public"."proveedor"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compra" ADD CONSTRAINT "compra_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compra" ADD CONSTRAINT "compra_anulado_por_id_user_id_fk" FOREIGN KEY ("anulado_por_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compra_linea" ADD CONSTRAINT "compra_linea_compra_id_compra_id_fk" FOREIGN KEY ("compra_id") REFERENCES "public"."compra"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compra_linea" ADD CONSTRAINT "compra_linea_producto_id_producto_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."producto"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "compra_estado_fecha_id" ON "compra" USING btree ("estado","fecha_operacion","id");--> statement-breakpoint
CREATE INDEX "compra_proveedor" ON "compra" USING btree ("proveedor_id");--> statement-breakpoint
CREATE INDEX "compra_linea_producto" ON "compra_linea" USING btree ("producto_id");--> statement-breakpoint
ALTER TABLE "movimiento_stock" ADD CONSTRAINT "movimiento_stock_compra_linea_id_compra_linea_id_fk" FOREIGN KEY ("compra_linea_id") REFERENCES "public"."compra_linea"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "movimiento_stock_compra_linea_tipo_unico" ON "movimiento_stock" USING btree ("compra_linea_id","tipo") WHERE "movimiento_stock"."compra_linea_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "movimiento_stock" ADD CONSTRAINT "movimiento_stock_origen_unico" CHECK (num_nonnulls("movimiento_stock"."ajuste_id", "movimiento_stock"."venta_linea_id", "movimiento_stock"."compra_linea_id") = 1);