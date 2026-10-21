// Schema de Better Auth: tablas user, session, account, verification y rate_limit.
//
// Generado con la CLI de Better Auth 1.7.11 (ver scripts/auth/config-generar-schema.ts) y
// revisado contra el blueprint (seccion 5) y el ADR-003. Ajustes respecto de lo generado, a
// repetir si se vuelve a generar:
//  - Todas las fechas son `timestamptz` (UTC), como pide el ADR-003; la CLI genera `timestamp`
//    sin zona horaria.
//  - Indices de vencimiento en session y verification.
//  - Unicidad (providerId, accountId) en account.
// Los nombres de tablas y columnas son los de la libreria y no se renombran.
import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  bigint,
  timestamp,
  boolean,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const fecha = (nombre: string) => timestamp(nombre, { withTimezone: true });

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: fecha("created_at").defaultNow().notNull(),
  updatedAt: fecha("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: fecha("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: fecha("created_at").defaultNow().notNull(),
    updatedAt: fecha("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("session_userId_idx").on(table.userId),
    index("session_expiresAt_idx").on(table.expiresAt),
  ],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: fecha("access_token_expires_at"),
    refreshTokenExpiresAt: fecha("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: fecha("created_at").defaultNow().notNull(),
    updatedAt: fecha("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("account_userId_idx").on(table.userId),
    uniqueIndex("account_providerId_accountId_uidx").on(table.providerId, table.accountId),
  ],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: fecha("expires_at").notNull(),
    createdAt: fecha("created_at").defaultNow().notNull(),
    updatedAt: fecha("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("verification_identifier_idx").on(table.identifier),
    index("verification_expiresAt_idx").on(table.expiresAt),
  ],
);

export const rateLimit = pgTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));
