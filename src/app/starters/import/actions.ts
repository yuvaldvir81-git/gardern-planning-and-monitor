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

function isRowEmpty(row: string[]): boolean {
  return row.every((cell) => !cell?.trim());
}

/**
 * A sheet often has stray content outside the real data — trailing notes
 * below a blank line, unrelated columns further right. Find the header row,
 * then bound the table by the first fully empty row and the first empty
 * header cell, rather than assuming the whole sheet is the table.
 */
function extractContiguousTable(table: string[][]): { headers: string[]; rows: string[][] } {
  const headerRowIndex = table.findIndex((row) => !isRowEmpty(row));
  if (headerRowIndex === -1) throw new Error("The file appears to be empty");
  const headerRow = table[headerRowIndex];

  const colStart = headerRow.findIndex((cell) => cell?.trim());
  let colEnd = colStart;
  for (let i = colStart; i < headerRow.length; i++) {
    if (!headerRow[i]?.trim()) break;
    colEnd = i;
  }

  const headers = headerRow.slice(colStart, colEnd + 1).map((h) => h.trim());
  const rows: string[][] = [];
  for (let r = headerRowIndex + 1; r < table.length; r++) {
    const slice = table[r].slice(colStart, colEnd + 1);
    if (isRowEmpty(slice)) break;
    rows.push(headers.map((_, i) => (slice[i] ?? "").toString().trim()));
  }

  return { headers, rows };
}

export async function parseImportFile(formData: FormData) {
  await requireUserId();

  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("No file provided");
  const requestedSheet = formData.get("sheet");
  const sheetName = typeof requestedSheet === "string" && requestedSheet ? requestedSheet : undefined;

  const isCsv = file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv";

  let table: string[][];

  if (isCsv) {
    const text = await file.text();
    const result = Papa.parse<string[]>(text, { skipEmptyLines: false });
    table = result.data;
  } else {
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    if (workbook.worksheets.length === 0) throw new Error("The file has no sheets");

    if (!sheetName && workbook.worksheets.length > 1) {
      return {
        needsSheetSelection: true as const,
        sheets: workbook.worksheets.map((ws) => ws.name),
        headers: [],
        rows: [] as string[][],
        truncated: false,
      };
    }

    const worksheet = sheetName ? workbook.getWorksheet(sheetName) : workbook.worksheets[0];
    if (!worksheet) throw new Error(`Sheet "${sheetName}" was not found`);

    table = [];
    worksheet.eachRow({ includeEmpty: true }, (row) => {
      const values = (row.values as unknown[]).slice(1);
      table.push(values.map(cellToString));
    });
  }

  const { headers, rows: allRows } = extractContiguousTable(table);
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
