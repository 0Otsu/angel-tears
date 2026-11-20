import { sql } from "drizzle-orm"
import { check, pgTable, smallint, text } from "drizzle-orm/pg-core"
import type { DiaAtencion } from "@/lib/modulos/configuracion/contrato"

export const configuracionNegocio = pgTable("configuracion_negocio", {
  id: smallint("id").primaryKey(),
  direccion: text("direccion").notNull(),
  localidad: text("localidad").notNull(),
  provincia: text("provincia").notNull(),
  referencia: text("referencia").notNull(),
  diasAtencion: text("dias_atencion").array().$type<DiaAtencion[]>().notNull(),
  apertura: text("apertura").notNull(),
  cierre: text("cierre").notNull(),
  comoLlegar: text("como_llegar").notNull(),
  telefonoWhatsApp: text("telefono_whatsapp").notNull(),
  usuarioInstagram: text("usuario_instagram").notNull(),
}, (tabla) => [check("configuracion_negocio_id_unico", sql`${tabla.id} = 1`)])
