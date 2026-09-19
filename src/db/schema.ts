import { relations } from "drizzle-orm";
import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  numeric,
  date,
  uuid,
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

export const plantStarters = pgTable("plant_starters", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
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

export const plantStartersRelations = relations(plantStarters, ({ many }) => ({
  growthEntries: many(growthEntries),
}));

export const growthEntriesRelations = relations(growthEntries, ({ one }) => ({
  starter: one(plantStarters, {
    fields: [growthEntries.starterId],
    references: [plantStarters.id],
  }),
}));
