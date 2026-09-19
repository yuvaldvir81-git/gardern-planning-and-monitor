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
