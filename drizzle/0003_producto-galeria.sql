CREATE TABLE "producto_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"producto_id" uuid NOT NULL,
	"tipo" text DEFAULT 'imagen' NOT NULL,
	"orden" integer NOT NULL,
	"principal" boolean DEFAULT false NOT NULL,
	"asset_id" text NOT NULL,
	"public_id" text NOT NULL,
	"version_proveedor" text NOT NULL,
	"url_segura" text NOT NULL,
	"ancho" integer NOT NULL,
	"alto" integer NOT NULL,
	"formato" text NOT NULL,
	CONSTRAINT "producto_media_cupo" CHECK ("producto_media"."orden" BETWEEN 1 AND 7),
	CONSTRAINT "producto_media_imagen" CHECK ("producto_media"."tipo" = 'imagen' AND "producto_media"."ancho" > 0 AND "producto_media"."alto" > 0 AND "producto_media"."ancho"::bigint * "producto_media"."alto" <= 20000000 AND "producto_media"."formato" IN ('jpeg','png','webp') AND "producto_media"."url_segura" ~ '^https://' AND length(btrim("producto_media"."asset_id")) > 0 AND length(btrim("producto_media"."public_id")) > 0 AND length(btrim("producto_media"."version_proveedor")) > 0)
);
--> statement-breakpoint
ALTER TABLE "producto_media" ADD CONSTRAINT "producto_media_producto_id_producto_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."producto"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "producto_media_posicion" ON "producto_media" USING btree ("producto_id","orden");--> statement-breakpoint
CREATE UNIQUE INDEX "producto_media_principal" ON "producto_media" USING btree ("producto_id") WHERE "producto_media"."principal";--> statement-breakpoint
CREATE INDEX "producto_media_recurso" ON "producto_media" USING btree ("public_id");
--> statement-breakpoint
-- Backfill sin llamadas al proveedor ni cambios comerciales.
INSERT INTO producto_media (producto_id,tipo,orden,principal,asset_id,public_id,version_proveedor,url_segura,ancho,alto,formato)
SELECT id,'imagen',1,true,imagen_asset_id,imagen_public_id,imagen_version_proveedor,imagen_url_segura,imagen_ancho,imagen_alto,imagen_formato
FROM producto WHERE imagen_asset_id IS NOT NULL;
--> statement-breakpoint
-- Puente para los endpoints 2.2/2.3 y la proyeccion principal existente.
CREATE FUNCTION producto_sincronizar_principal() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE medio uuid; posicion integer;
BEGIN
 IF NEW.imagen_asset_id IS NULL THEN
   DELETE FROM producto_media WHERE producto_id=NEW.id AND principal;
 ELSE
   SELECT id INTO medio FROM producto_media WHERE producto_id=NEW.id AND principal;
   IF medio IS NULL THEN
     SELECT n INTO posicion FROM generate_series(1,7) n WHERE NOT EXISTS (SELECT 1 FROM producto_media WHERE producto_id=NEW.id AND orden=n) ORDER BY n LIMIT 1;
     INSERT INTO producto_media(producto_id,orden,principal,asset_id,public_id,version_proveedor,url_segura,ancho,alto,formato)
     VALUES(NEW.id,posicion,true,NEW.imagen_asset_id,NEW.imagen_public_id,NEW.imagen_version_proveedor,NEW.imagen_url_segura,NEW.imagen_ancho,NEW.imagen_alto,NEW.imagen_formato);
   ELSE
     UPDATE producto_media SET asset_id=NEW.imagen_asset_id,public_id=NEW.imagen_public_id,version_proveedor=NEW.imagen_version_proveedor,url_segura=NEW.imagen_url_segura,ancho=NEW.imagen_ancho,alto=NEW.imagen_alto,formato=NEW.imagen_formato WHERE id=medio;
   END IF;
 END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER producto_sincronizar_principal AFTER INSERT OR UPDATE OF imagen_asset_id,imagen_public_id,imagen_version_proveedor,imagen_url_segura,imagen_ancho,imagen_alto,imagen_formato ON producto FOR EACH ROW EXECUTE FUNCTION producto_sincronizar_principal();
--> statement-breakpoint
CREATE FUNCTION producto_comprobar_galeria() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE clave uuid; p producto; m producto_media;
BEGIN
 IF TG_TABLE_NAME='producto' THEN clave := COALESCE(NEW.id,OLD.id); ELSE clave := COALESCE(NEW.producto_id,OLD.producto_id); END IF;
 SELECT * INTO p FROM producto WHERE id=clave;
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT * INTO m FROM producto_media WHERE producto_id=clave AND principal;
 IF (p.publicado AND m.id IS NULL) OR (p.imagen_asset_id IS DISTINCT FROM m.asset_id)
 OR (p.imagen_public_id IS DISTINCT FROM m.public_id) OR (p.imagen_url_segura IS DISTINCT FROM m.url_segura)
 OR (p.imagen_version_proveedor IS DISTINCT FROM m.version_proveedor) OR (p.imagen_ancho IS DISTINCT FROM m.ancho)
 OR (p.imagen_alto IS DISTINCT FROM m.alto) OR (p.imagen_formato IS DISTINCT FROM m.formato) THEN
   RAISE EXCEPTION 'Principal de Producto y galeria inconsistentes' USING ERRCODE='23514';
 END IF;
 RETURN NULL;
END $$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER producto_galeria_consistente AFTER INSERT OR UPDATE ON producto DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION producto_comprobar_galeria();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER medio_galeria_consistente AFTER INSERT OR UPDATE OR DELETE ON producto_media DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION producto_comprobar_galeria();
