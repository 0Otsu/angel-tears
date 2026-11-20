CREATE TABLE "cuota_recuperacion" (
	"id" smallint PRIMARY KEY NOT NULL,
	"dia_utc" date NOT NULL,
	"intentos" integer NOT NULL,
	"ultimo_intento" timestamp with time zone NOT NULL,
	CONSTRAINT "cuota_recuperacion_fila_unica" CHECK ("cuota_recuperacion"."id" = 1),
	CONSTRAINT "cuota_recuperacion_intentos_positivos" CHECK ("cuota_recuperacion"."intentos" > 0)
);
