"use server";

import ExcelJS from "exceljs";
import Papa from "papaparse";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { plantStarters } from "@/db/schema";
import { requireUserId } from "../actions";
import { starterFormSchema } from "@/lib/validations";
import type { NormalizedImportRow } from "@/lib/import";

const MAX_ROWS = 500;

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("text" in value && typeof (value as { text: unknown }).text === "string") {
      return (value as { text: string }).text;
    }
    if ("richText" in value && Array.isArray((value as { richText: unknown }).richText)) {
      return (value as { richText: { text: string }[] }).richText.map((r) => r.text).join("");
    }
    if ("result" in value) return cellToString((value as { result: unknown }).result);
  }
  return String(value);
}

export async function parseImportFile(formData: FormData) {
  await requireUserId();

  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("No file provided");

  const isCsv = file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv";

  let table: string[][];

  if (isCsv) {
    const text = await file.text();
    const result = Papa.parse<string[]>(text, { skipEmptyLines: true });
    table = result.data;
  } else {
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) throw new Error("The file has no sheets");
    table = [];
    worksheet.eachRow((row) => {
      const values = (row.values as unknown[]).slice(1);
      table.push(values.map(cellToString));
    });
  }

  const [headerRow, ...dataRows] = table;
  if (!headerRow || headerRow.every((h) => !h.trim())) {
    throw new Error("The file appears to be empty");
  }

  const headers = headerRow.map((h) => h.trim());
  const truncated = dataRows.length > MAX_ROWS;
  const rows = dataRows
    .slice(0, MAX_ROWS)
    .filter((row) => row.some((cell) => cell?.trim()))
    .map((row) => headers.map((_, i) => (row[i] ?? "").toString().trim()));

  return { headers, rows, truncated };
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
