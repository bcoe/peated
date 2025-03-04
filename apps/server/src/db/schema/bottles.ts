import { relations, sql } from "drizzle-orm";
import {
  bigint,
  bigserial,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

import { entities } from "./entities";
import { categoryEnum, contentSourceEnum, flavorProfileEnum } from "./enums";
import { users } from "./users";

type TastingNotes = {
  nose: string;
  palate: string;
  finish: string;
};

export const bottles = pgTable(
  "bottle",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    category: categoryEnum("category"),
    brandId: bigint("brand_id", { mode: "number" })
      .references(() => entities.id)
      .notNull(),
    bottlerId: bigint("bottler_id", { mode: "number" }).references(
      () => entities.id,
    ),
    statedAge: smallint("stated_age"),
    flavorProfile: flavorProfileEnum("flavor_profile"),

    description: text("description"),
    descriptionSrc: contentSourceEnum("description_src"),

    tastingNotes: jsonb("tasting_notes").$type<TastingNotes>(),
    suggestedTags: varchar("suggested_tags", { length: 64 })
      .array()
      .default(sql`array[]::varchar[]`)
      .notNull(),

    avgRating: doublePrecision("avg_rating"),
    totalTastings: bigint("total_tastings", { mode: "number" })
      .default(0)
      .notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    createdById: bigint("created_by_id", { mode: "number" })
      .references(() => users.id)
      .notNull(),
  },
  (bottles) => {
    return {
      unique: uniqueIndex("bottle_brand_unq").on(bottles.name, bottles.brandId),
      uniqueName: uniqueIndex("bottle_full_name_unq")
        .on(bottles.fullName)
        .using(sql`btree (LOWER(full_name))`),
      brandIdx: index("bottle_brand_idx").on(bottles.brandId),
      bottlerIdx: index("bottle_bottler_idx").on(bottles.bottlerId),
      createdById: index("bottle_created_by_idx").on(bottles.createdById),
      categoryIdx: index("bottle_category_idx").on(bottles.category),
      flavorProfileIdx: index("bottle_flavor_profile_idx").on(
        bottles.flavorProfile,
      ),
    };
  },
);

export const bottlesRelations = relations(bottles, ({ one, many }) => ({
  brand: one(entities, {
    fields: [bottles.brandId],
    references: [entities.id],
  }),
  bottler: one(entities, {
    fields: [bottles.bottlerId],
    references: [entities.id],
  }),
  bottlesToDistillers: many(bottlesToDistillers),
  createdBy: one(users, {
    fields: [bottles.createdById],
    references: [users.id],
  }),
}));

export type Bottle = typeof bottles.$inferSelect;
export type NewBottle = typeof bottles.$inferInsert;

export const bottlesToDistillers = pgTable(
  "bottle_distiller",
  {
    bottleId: bigint("bottle_id", { mode: "number" })
      .references(() => bottles.id)
      .notNull(),
    distillerId: bigint("distiller_id", { mode: "number" })
      .references(() => entities.id)
      .notNull(),
  },
  (bottlesToDistillers) => {
    return {
      bottleDistillerId: primaryKey(
        bottlesToDistillers.bottleId,
        bottlesToDistillers.distillerId,
      ),
    };
  },
);

export const bottlesToDistillersRelations = relations(
  bottlesToDistillers,
  ({ one }) => ({
    bottle: one(bottles, {
      fields: [bottlesToDistillers.bottleId],
      references: [bottles.id],
    }),
    distiller: one(entities, {
      fields: [bottlesToDistillers.distillerId],
      references: [entities.id],
    }),
  }),
);

export type BottlesToDistillers = typeof bottlesToDistillers.$inferSelect;
export type NewBottlesToDistillers = typeof bottlesToDistillers.$inferInsert;

export const bottleTags = pgTable(
  "bottle_tag",
  {
    bottleId: bigint("bottle_id", { mode: "number" })
      .references(() => bottles.id)
      .notNull(),
    tag: varchar("tag", { length: 64 }).notNull(),
    count: integer("count").default(0).notNull(),
  },
  (bottleTags) => {
    return {
      pk: primaryKey(bottleTags.bottleId, bottleTags.tag),
    };
  },
);

export const bottleTagsRelations = relations(bottleTags, ({ one }) => ({
  bottle: one(bottles, {
    fields: [bottleTags.bottleId],
    references: [bottles.id],
  }),
}));

export type BottleTag = typeof bottleTags.$inferSelect;
export type NewBottleTag = typeof bottleTags.$inferInsert;

export const bottleAliases = pgTable(
  "bottle_alias",
  {
    bottleId: bigint("bottle_id", { mode: "number" }).references(
      () => bottles.id,
    ),
    name: varchar("name", { length: 255 }).notNull(),
  },
  (bottleAliases) => {
    return {
      pk: primaryKey(bottleAliases.name),
      bottleIdx: index("bottle_alias_bottle_idx").on(bottleAliases.bottleId),
    };
  },
);

export const bottleAliasesRelations = relations(bottleAliases, ({ one }) => ({
  bottle: one(bottles, {
    fields: [bottleAliases.bottleId],
    references: [bottles.id],
  }),
}));

export type BottleAlias = typeof bottleAliases.$inferSelect;
export type NewBottleAlias = typeof bottleAliases.$inferInsert;

export const bottleTombstones = pgTable("bottle_tombstone", {
  bottleId: bigint("bottle_id", { mode: "number" }).primaryKey(),
  newBottleId: bigint("new_bottle_id", { mode: "number" }),
});

export const bottleTombstonesRelations = relations(
  bottleTombstones,
  ({ one }) => ({
    bottle: one(bottles, {
      fields: [bottleTombstones.bottleId],
      references: [bottles.id],
    }),
    newBottle: one(bottles, {
      fields: [bottleTombstones.newBottleId],
      references: [bottles.id],
    }),
  }),
);

export type BottleTombstone = typeof bottleTombstones.$inferSelect;
export type NewBottleTombstone = typeof bottleTombstones.$inferInsert;

export const bottleFlavorProfiles = pgTable(
  "bottle_flavor_profile",
  {
    bottleId: bigint("bottle_id", { mode: "number" })
      .references(() => bottles.id)
      .notNull(),
    flavorProfile: flavorProfileEnum("flavor_profile").notNull(),
    count: integer("count").default(0).notNull(),
  },
  (table) => {
    return {
      pk: primaryKey(table.bottleId, table.flavorProfile),
    };
  },
);

export const bottleFlavorProfilesRelations = relations(
  bottleFlavorProfiles,
  ({ one }) => ({
    bottle: one(bottles, {
      fields: [bottleFlavorProfiles.bottleId],
      references: [bottles.id],
    }),
  }),
);

export type BottleFlavorProfile = typeof bottleFlavorProfiles.$inferSelect;
export type NewBottleFlavorProfile = typeof bottleFlavorProfiles.$inferInsert;
