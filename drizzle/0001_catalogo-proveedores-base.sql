CREATE TABLE "categoria" (
	"codigo" text PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	CONSTRAINT "categoria_nombre_requerido" CHECK (length(btrim("categoria"."nombre")) > 0)
);
--> statement-breakpoint
CREATE TABLE "producto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"nombre" text NOT NULL,
	"precio" numeric(18, 2) NOT NULL,
	"categoria_codigo" text NOT NULL,
	"descripcion" text,
	"material" text,
	"medida" text,
	"color" text,
	"cuidados" text,
	"publicado" boolean DEFAULT false NOT NULL,
	"destacado" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"imagen_asset_id" text,
	"imagen_public_id" text,
	"imagen_version_proveedor" text,
	"imagen_url_segura" text,
	"imagen_ancho" integer,
	"imagen_alto" integer,
	"imagen_formato" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "producto_slug_unico" UNIQUE("slug"),
	CONSTRAINT "producto_nombre_requerido" CHECK (length(btrim("producto"."nombre")) > 0),
	CONSTRAINT "producto_slug_formato" CHECK ("producto"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "producto_version_positiva" CHECK ("producto"."version" > 0),
	CONSTRAINT "producto_precio_finito" CHECK ("producto"."precio"::text NOT IN ('NaN', 'Infinity', '-Infinity')),
	CONSTRAINT "producto_imagen_completa" CHECK ((
    ("producto"."imagen_asset_id" IS NULL AND "producto"."imagen_public_id" IS NULL
      AND "producto"."imagen_version_proveedor" IS NULL AND "producto"."imagen_url_segura" IS NULL
      AND "producto"."imagen_ancho" IS NULL AND "producto"."imagen_alto" IS NULL AND "producto"."imagen_formato" IS NULL)
    OR
    ("producto"."imagen_asset_id" IS NOT NULL AND length(btrim("producto"."imagen_asset_id")) > 0
      AND "producto"."imagen_public_id" IS NOT NULL AND length(btrim("producto"."imagen_public_id")) > 0
      AND "producto"."imagen_version_proveedor" IS NOT NULL AND length(btrim("producto"."imagen_version_proveedor")) > 0
      AND "producto"."imagen_url_segura" IS NOT NULL AND "producto"."imagen_url_segura" ~ '^https://[^/[:space:]]+'
      AND "producto"."imagen_ancho" IS NOT NULL AND "producto"."imagen_ancho" > 0
      AND "producto"."imagen_alto" IS NOT NULL AND "producto"."imagen_alto" > 0
      AND "producto"."imagen_formato" IS NOT NULL AND "producto"."imagen_formato" IN ('jpeg', 'png', 'webp'))
  )),
	CONSTRAINT "producto_publicado_con_imagen" CHECK (NOT "producto"."publicado" OR "producto"."imagen_asset_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "proveedor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"telefono" text,
	"instagram" text,
	"nota" text,
	"activo" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "producto" ADD CONSTRAINT "producto_categoria_codigo_categoria_codigo_fk" FOREIGN KEY ("categoria_codigo") REFERENCES "public"."categoria"("codigo") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "producto_publicado_categoria_id" ON "producto" USING btree ("publicado","categoria_codigo","id");--> statement-breakpoint
CREATE INDEX "proveedor_activo_nombre_id_idx" ON "proveedor" USING btree ("activo","nombre","id");