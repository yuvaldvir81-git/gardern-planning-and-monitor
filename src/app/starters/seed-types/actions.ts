"use server";

import { generateText, Output } from "ai";
import { z } from "zod";
import { and, asc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { seedTypes } from "@/db/schema";
import { requireUserId } from "../actions";
import { seedTypeMetadataFormSchema, type SeedTypeMetadataFormValues } from "@/lib/validations";

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

export async function getSeedTypesForUser() {
  const userId = await requireUserId();
  const db = getDb();

  return db
    .select()
    .from(seedTypes)
    .where(eq(seedTypes.userId, userId))
    .orderBy(asc(seedTypes.name));
}

const generatedMetadataSchema = z.object({
  daysToGerminateMin: z
    .number()
    .int()
    .positive()
    .nullable()
    .describe("Typical minimum days to germination, or null if unknown"),
  daysToGerminateMax: z
    .number()
    .int()
    .positive()
    .nullable()
    .describe("Typical maximum days to germination, or null if unknown"),
  daysToMaturity: z
    .number()
    .int()
    .positive()
    .nullable()
    .describe(
      "Typical days from planting (or transplanting) to harvest/bloom, or null if unknown"
    ),
  sunRequirement: z
    .string()
    .nullable()
    .describe("Short sun exposure requirement, e.g. 'Full sun' or 'Partial shade'"),
  spacingCm: z
    .number()
    .positive()
    .nullable()
    .describe("Recommended spacing between plants in centimeters, or null if unknown"),
  notes: z
    .string()
    .nullable()
    .describe("One or two sentences of practical growing advice for starting this seed"),
});

async function generateMetadataForName(name: string) {
  const { output } = await generateText({
    model: "anthropic/claude-sonnet-5",
    output: Output.object({ schema: generatedMetadataSchema }),
    prompt: `You are a horticulture reference assistant helping a home gardener. Give typical, general-knowledge growing information for starting this seed/plant from seed: "${name}".

Use realistic ranges for a home gardener, not extremes. If you are not confident about a field, return null for it rather than guessing.`,
  });
  return output;
}

async function applyGeneratedMetadata(id: string, data: z.infer<typeof generatedMetadataSchema>) {
  const db = getDb();
  await db
    .update(seedTypes)
    .set({
      daysToGerminateMin: data.daysToGerminateMin,
      daysToGerminateMax: data.daysToGerminateMax,
      daysToMaturity: data.daysToMaturity,
      sunRequirement: data.sunRequirement,
      spacingCm: data.spacingCm !== null ? String(data.spacingCm) : null,
      notes: data.notes,
      metadataGeneratedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(seedTypes.id, id));
}

export async function generateSeedMetadata(id: string) {
  const userId = await requireUserId();
  const db = getDb();

  const [seedType] = await db
    .select()
    .from(seedTypes)
    .where(and(eq(seedTypes.id, id), eq(seedTypes.userId, userId)));
  if (!seedType) throw new Error("Seed type not found");

  const data = await generateMetadataForName(seedType.name);
  await applyGeneratedMetadata(id, data);

  revalidatePath("/starters/seeds");
}

export async function generateAllMissingSeedMetadata() {
  const userId = await requireUserId();
  const db = getDb();

  const missing = await db
    .select()
    .from(seedTypes)
    .where(and(eq(seedTypes.userId, userId), isNull(seedTypes.metadataGeneratedAt)));

  let succeeded = 0;
  let failed = 0;
  for (const seedType of missing) {
    try {
      const data = await generateMetadataForName(seedType.name);
      await applyGeneratedMetadata(seedType.id, data);
      succeeded++;
    } catch {
      failed++;
    }
  }

  revalidatePath("/starters/seeds");
  return { succeeded, failed, total: missing.length };
}

export async function updateSeedTypeMetadata(id: string, values: SeedTypeMetadataFormValues) {
  const userId = await requireUserId();
  const data = seedTypeMetadataFormSchema.parse(values);
  const db = getDb();

  await db
    .update(seedTypes)
    .set({
      daysToGerminateMin: data.daysToGerminateMin ? Number(data.daysToGerminateMin) : null,
      daysToGerminateMax: data.daysToGerminateMax ? Number(data.daysToGerminateMax) : null,
      daysToMaturity: data.daysToMaturity ? Number(data.daysToMaturity) : null,
      sunRequirement: data.sunRequirement || null,
      spacingCm: data.spacingCm || null,
      notes: data.notes || null,
      updatedAt: new Date(),
    })
    .where(and(eq(seedTypes.id, id), eq(seedTypes.userId, userId)));

  revalidatePath("/starters/seeds");
}
