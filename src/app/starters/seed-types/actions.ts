"use server";

import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { seedTypes } from "@/db/schema";
import { requireUserId } from "../actions";

/** Upserts any new seed names into the user's seed bank. Safe to call with names already present. */
export async function ensureSeedTypes(userId: string, names: string[]) {
  const unique = Array.from(new Set(names.map((n) => n.trim()).filter(Boolean)));
  if (unique.length === 0) return;

  const db = getDb();
  await db
    .insert(seedTypes)
    .values(unique.map((name) => ({ userId, name })))
    .onConflictDoNothing({ target: [seedTypes.userId, seedTypes.name] });
}

export async function getSeedTypeNames() {
  const userId = await requireUserId();
  const db = getDb();

  const rows = await db
    .select({ name: seedTypes.name })
    .from(seedTypes)
    .where(eq(seedTypes.userId, userId))
    .orderBy(asc(seedTypes.name));

  return rows.map((r) => r.name);
}
