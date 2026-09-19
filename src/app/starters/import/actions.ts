"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { plantStarters } from "@/db/schema";
import { requireUserId } from "../actions";
import { starterFormSchema } from "@/lib/validations";
import { extractContiguousTable, readSheetTable } from "@/lib/spreadsheet";
import type { NormalizedImportRow } from "@/lib/import";

const MAX_ROWS = 500;

export async function parseImportFile(formData: FormData) {
  await requireUserId();

  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("No file provided");
  const requestedSheet = formData.get("sheet");
  const sheetName = typeof requestedSheet === "string" && requestedSheet ? requestedSheet : undefined;

  const result = await readSheetTable(file, sheetName);
  if (result.needsSheetSelection) {
    return {
      needsSheetSelection: true as const,
      sheets: result.sheets,
      headers: [] as string[],
      rows: [] as string[][],
      truncated: false,
    };
  }

  const { headers, rows: allRows } = extractContiguousTable(result.table);
  const truncated = allRows.length > MAX_ROWS;

  return {
    needsSheetSelection: false as const,
    headers,
    rows: allRows.slice(0, MAX_ROWS),
    truncated,
  };
}

export async function importStarters(values: NormalizedImportRow["values"][]) {
  const userId = await requireUserId();
  if (values.length === 0) return { imported: 0 };

  const parsed = values.map((v) => starterFormSchema.parse(v));
  const db = getDb();

  await db.insert(plantStarters).values(
    parsed.map((data) => ({
      userId,
      name: data.name,
      species: data.species || null,
      variety: data.variety || null,
      seedSource: data.seedSource || null,
      datePlanted: data.datePlanted,
      location: data.location || null,
      status: data.status,
      notes: data.notes || null,
    }))
  );

  revalidatePath("/starters");
  return { imported: parsed.length };
}
