"use server";

import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { growthEntries, plantStarters } from "@/db/schema";
import {
  growthEntryFormSchema,
  starterFormSchema,
  type GrowthEntryFormValues,
  type StarterFormValues,
} from "@/lib/validations";
import { ensureSeedTypes } from "./seed-types/actions";

export async function requireUserId() {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

export async function createStarter(values: StarterFormValues) {
  const userId = await requireUserId();
  const data = starterFormSchema.parse(values);
  const db = getDb();

  await db.insert(plantStarters).values({
    userId,
    name: data.name,
    species: data.species || null,
    variety: data.variety || null,
    seedSource: data.seedSource || null,
    datePlanted: data.datePlanted,
    location: data.location || null,
    status: data.status,
    notes: data.notes || null,
  });
  await ensureSeedTypes(userId, [data.name]);

  revalidatePath("/starters");
}

export async function updateStarter(id: string, values: StarterFormValues) {
  const userId = await requireUserId();
  const data = starterFormSchema.parse(values);
  const db = getDb();

  await db
    .update(plantStarters)
    .set({
      name: data.name,
      species: data.species || null,
      variety: data.variety || null,
      seedSource: data.seedSource || null,
      datePlanted: data.datePlanted,
      location: data.location || null,
      status: data.status,
      notes: data.notes || null,
      updatedAt: new Date(),
    })
    .where(and(eq(plantStarters.id, id), eq(plantStarters.userId, userId)));
  await ensureSeedTypes(userId, [data.name]);

  revalidatePath("/starters");
  revalidatePath(`/starters/${id}`);
}

export async function deleteStarter(id: string) {
  const userId = await requireUserId();
  const db = getDb();

  await db
    .delete(plantStarters)
    .where(and(eq(plantStarters.id, id), eq(plantStarters.userId, userId)));

  revalidatePath("/starters");
}

export async function addGrowthEntry(starterId: string, values: GrowthEntryFormValues) {
  const userId = await requireUserId();
  const data = growthEntryFormSchema.parse(values);
  const db = getDb();

  const [starter] = await db
    .select({ id: plantStarters.id })
    .from(plantStarters)
    .where(and(eq(plantStarters.id, starterId), eq(plantStarters.userId, userId)));
  if (!starter) throw new Error("Starter not found");

  await db.insert(growthEntries).values({
    starterId,
    entryDate: data.entryDate,
    heightCm: data.heightCm || null,
    stage: data.stage || null,
    notes: data.notes || null,
  });

  if (data.stage) {
    await db
      .update(plantStarters)
      .set({ status: data.stage, updatedAt: new Date() })
      .where(eq(plantStarters.id, starterId));
  }

  revalidatePath(`/starters/${starterId}`);
  revalidatePath("/starters");
}

export async function deleteGrowthEntry(entryId: string, starterId: string) {
  await requireUserId();
  const db = getDb();

  await db.delete(growthEntries).where(eq(growthEntries.id, entryId));

  revalidatePath(`/starters/${starterId}`);
}

export async function getStartersForUser() {
  const userId = await requireUserId();
  const db = getDb();

  return db
    .select()
    .from(plantStarters)
    .where(and(eq(plantStarters.userId, userId), isNull(plantStarters.trayId)))
    .orderBy(desc(plantStarters.createdAt));
}

export async function getStarterWithEntries(id: string) {
  const userId = await requireUserId();
  const db = getDb();

  const [starter] = await db
    .select()
    .from(plantStarters)
    .where(and(eq(plantStarters.id, id), eq(plantStarters.userId, userId)));
  if (!starter) return null;

  const entries = await db
    .select()
    .from(growthEntries)
    .where(eq(growthEntries.starterId, id))
    .orderBy(desc(growthEntries.entryDate));

  return { starter, entries };
}
