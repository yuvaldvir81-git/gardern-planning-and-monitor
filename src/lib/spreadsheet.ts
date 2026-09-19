import ExcelJS from "exceljs";
import Papa from "papaparse";

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

export function isRowEmpty(row: string[]): boolean {
  return row.every((cell) => !cell?.trim());
}

export type SheetTableResult =
  | { needsSheetSelection: true; sheets: string[] }
  | { needsSheetSelection: false; table: string[][] };

/** Reads an uploaded .xlsx/.csv file into a raw 2D string table, or reports the sheet names if the caller needs to pick one first. */
export async function readSheetTable(file: File, sheetName?: string): Promise<SheetTableResult> {
  const isCsv = file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv";

  if (isCsv) {
    const text = await file.text();
    const result = Papa.parse<string[]>(text, { skipEmptyLines: false });
    return { needsSheetSelection: false, table: result.data };
  }

  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  if (workbook.worksheets.length === 0) throw new Error("The file has no sheets");

  if (!sheetName && workbook.worksheets.length > 1) {
    return { needsSheetSelection: true, sheets: workbook.worksheets.map((ws) => ws.name) };
  }

  const worksheet = sheetName ? workbook.getWorksheet(sheetName) : workbook.worksheets[0];
  if (!worksheet) throw new Error(`Sheet "${sheetName}" was not found`);

  return { needsSheetSelection: false, table: worksheetToTable(worksheet) };
}

function worksheetToTable(worksheet: ExcelJS.Worksheet): string[][] {
  const table: string[][] = [];
  worksheet.eachRow({ includeEmpty: true }, (row) => {
    const values = (row.values as unknown[]).slice(1);
    table.push(values.map(cellToString));
  });
  return table;
}

/** Reads every sheet in the file into a raw table, named after the sheet (or the file, for CSV). */
export async function readAllSheetTables(
  file: File
): Promise<{ name: string; table: string[][] }[]> {
  const isCsv = file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv";

  if (isCsv) {
    const text = await file.text();
    const result = Papa.parse<string[]>(text, { skipEmptyLines: false });
    return [{ name: file.name.replace(/\.csv$/i, ""), table: result.data }];
  }

  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  if (workbook.worksheets.length === 0) throw new Error("The file has no sheets");

  return workbook.worksheets.map((worksheet) => ({
    name: worksheet.name,
    table: worksheetToTable(worksheet),
  }));
}

/**
 * A sheet often has stray content outside the real data — trailing notes
 * below a blank line, unrelated columns further right. Find the header row,
 * then bound the table by the first fully empty row and the first empty
 * header cell, rather than assuming the whole sheet is the table.
 */
export function extractContiguousTable(table: string[][]): {
  headers: string[];
  rows: string[][];
} {
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

/**
 * For a tray grid, every row is data (no header row) — a physical layout of
 * cells, each either holding a seed name or empty. Bound the grid to the
 * rectangular block starting at the top-left: rows stop at the first fully
 * empty row, columns stop at the first column that's empty across every
 * included row.
 */
export function extractGrid(table: string[][]): string[][] {
  let rowEnd = table.findIndex((row) => isRowEmpty(row));
  if (rowEnd === -1) rowEnd = table.length;
  const rows = table.slice(0, rowEnd);
  if (rows.length === 0) throw new Error("The sheet appears to be empty");

  const maxCols = Math.max(...rows.map((r) => r.length));
  let colEnd = maxCols;
  for (let c = 0; c < maxCols; c++) {
    const colEmpty = rows.every((r) => !r[c]?.trim());
    if (colEmpty) {
      colEnd = c;
      break;
    }
  }
  if (colEnd === 0) throw new Error("The sheet appears to be empty");

  return rows.map((r) => Array.from({ length: colEnd }, (_, c) => (r[c] ?? "").toString().trim()));
}
