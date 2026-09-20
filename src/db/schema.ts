import { relations } from "drizzle-orm";
import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  numeric,
  integer,
  date,
  uuid,
  unique,
  jsonb,
} from "drizzle-orm/pg-core";

export const starterStatus = pgEnum("starter_status", [
  "seed",
  "germinating",
  "seedling",
  "transplanted",
  "growing",
  "harvested",
  "dead",
]);

export const appLocale = pgEnum("app_locale", ["en", "he"]);

export const userSettings = pgTable("user_settings", {
  userId: text("user_id").primaryKey(),
  language: appLocale("language").notNull().default("en"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const starterTrays = pgTable("starter_trays", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  rows: integer("rows").notNull(),
  cols: integer("cols").notNull(),
  datePlanted: date("date_planted").notNull(),
  location: text("location"),
  seedSource: text("seed_source"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const plantStarters = pgTable("plant_starters", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  trayId: uuid("tray_id").references(() => starterTrays.id, { onDelete: "cascade" }),
  rowIndex: integer("row_index"),
  colIndex: integer("col_index"),
  name: text("name").notNull(),
  species: text("species"),
  variety: text("variety"),
  seedSource: text("seed_source"),
  datePlanted: date("date_planted").notNull(),
  location: text("location"),
  status: starterStatus("status").notNull().default("seed"),
  notes: text("notes"),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const seedTypes = pgTable(
  "seed_types",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    daysToGerminateMin: integer("days_to_germinate_min"),
    daysToGerminateMax: integer("days_to_germinate_max"),
    daysToMaturity: integer("days_to_maturity"),
    sunRequirement: text("sun_requirement"),
    spacingCm: numeric("spacing_cm", { precision: 6, scale: 2 }),
    notes: text("notes"),
    metadataGeneratedAt: timestamp("metadata_generated_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [unique("seed_types_user_id_name_unique").on(table.userId, table.name)]
);

export const growthEntries = pgTable("growth_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  starterId: uuid("starter_id")
    .notNull()
    .references(() => plantStarters.id, { onDelete: "cascade" }),
  entryDate: date("entry_date").notNull(),
  heightCm: numeric("height_cm", { precision: 6, scale: 2 }),
  stage: starterStatus("stage"),
  notes: text("notes"),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const starterTraysRelations = relations(starterTrays, ({ many }) => ({
  starters: many(plantStarters),
}));

export const plantStartersRelations = relations(plantStarters, ({ many, one }) => ({
  growthEntries: many(growthEntries),
  tray: one(starterTrays, {
    fields: [plantStarters.trayId],
    references: [starterTrays.id],
  }),
}));

export const growthEntriesRelations = relations(growthEntries, ({ one }) => ({
  starter: one(plantStarters, {
    fields: [growthEntries.starterId],
    references: [plantStarters.id],
  }),
}));

export const gardens = pgTable("gardens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  addressLabel: text("address_label"),
  lat: numeric("lat", { precision: 9, scale: 6 }).notNull(),
  lng: numeric("lng", { precision: 9, scale: 6 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const gardenShapeType = pgEnum("garden_shape_type", [
  "boundary",
  "house",
  "tree",
  "vegetable_plot",
  "green_patch",
]);

export const gardenShapes = pgTable("garden_shapes", {
  id: uuid("id").primaryKey().defaultRandom(),
  gardenId: uuid("garden_id")
    .notNull()
    .references(() => gardens.id, { onDelete: "cascade" }),
  type: gardenShapeType("type").notNull(),
  label: text("label"),
  /** Array of {lat, lng} vertices. A single-point array for trees (center point). */
  points: jsonb("points").notNull().$type<{ lat: number; lng: number }[]>(),
  /** Obstacle height in meters — set for house/tree, null for boundary/plot/patch. */
  heightM: numeric("height_m", { precision: 5, scale: 2 }),
  /** Canopy radius in meters — set for tree only. */
  radiusM: numeric("radius_m", { precision: 6, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const gardensRelations = relations(gardens, ({ many }) => ({
  shapes: many(gardenShapes),
}));

export const gardenShapesRelations = relations(gardenShapes, ({ one }) => ({
  garden: one(gardens, {
    fields: [gardenShapes.gardenId],
    references: [gardens.id],
  }),
}));
