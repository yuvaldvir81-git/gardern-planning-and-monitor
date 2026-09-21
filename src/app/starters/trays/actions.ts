"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { getDb } from "@/db";
import { plantStarters, starterTrays } from "@/db/schema";
import { requireUserId } from "../actions";
import {
  trayBatchFormSchema,
  trayFormSchema,
  type TrayBatchFormValues,
  type TrayFormValues,
} from "@/lib/validations";
import { extractGrid, readAllSheetTables, readSheetTable } from "@/lib/spreadsheet";
import { ensureSeedTypes } from "../seed-types/actions";

const MAX_CELLS = 500;

function gridFilledCount(grid: string[][]): number {
  return grid.reduce((sum, row) => sum + row.filter((c) => c).length, 0);
}

async function insertTrayWithGrid(
  userId: string,
  name: string,
  data: TrayBatchFormValues,
  grid: string[][]
) {
  const db = getDb();
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;
  if (rows === 0 || cols === 0) throw new Error("The grid is empty");

  const [tray] = await db
    .insert(starterTrays)
    .values({
      userId,
      name,
      rows,
      cols,
      datePlanted: data.datePlanted,
      location: data.location || null,
      seedSource: data.seedSource || null,
      notes: data.notes || null,
    })
    .returning({ id: starterTrays.id });

  const cells = grid.flatMap((row, r) =>
    row.map((value, c) => ({ value: value.trim(), r, c })).filter((cell) => cell.value)
  );

  if (cells.length > 0) {
    await db.insert(plantStarters).values(
      cells.map((cell) => ({
        userId,
        trayId: tray.id,
        rowIndex: cell.r,
        colIndex: cell.c,
        name: cell.value,
        datePlanted: data.datePlanted,
        location: data.location || null,
        seedSource: data.seedSource || null,
        status: "seed" as const,
      }))
    );
    await ensureSeedTypes(userId, cells.map((cell) => cell.value));
  }

  return { trayId: tray.id, name, imported: cells.length };
}

export async function parseGridFile(formData: FormData) {
  await requireUserId();

  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("No file provided");
  const requestedSheet = formData.get("sheet");
  const sheetName = typeof requestedSheet === "string" && requestedSheet ? requestedSheet : undefined;

  const result = await readSheetTable(file, sheetName);
  if (result.needsSheetSelection) {
    return { needsSheetSelection: true as const, sheets: result.sheets, grid: [] as string[][] };
  }

  const grid = extractGrid(result.table);
  const cellCount = gridFilledCount(grid);
  if (cellCount > MAX_CELLS) {
    throw new Error(`This sheet has ${cellCount} filled cells — the limit is ${MAX_CELLS}.`);
  }

  return { needsSheetSelection: false as const, grid };
}

export type ParsedTraySheet =
  | { name: string; grid: string[][]; filledCount: number; error?: undefined }
  | { name: string; grid: []; filledCount: number; error: string };

export async function parseAllGridSheets(formData: FormData) {
  await requireUserId();

  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("No file provided");

  const sheets = await readAllSheetTables(file);

  const results: ParsedTraySheet[] = sheets.map(({ name, table }) => {
    try {
      const grid = extractGrid(table);
      const filledCount = gridFilledCount(grid);
      if (filledCount === 0) {
        return { name, grid: [], filledCount: 0, error: "No filled cells" };
      }
      if (filledCount > MAX_CELLS) {
        return {
          name,
          grid: [],
          filledCount,
          error: `Too many cells (limit ${MAX_CELLS})`,
        };
      }
      return { name, grid, filledCount };
    } catch (err) {
      return {
        name,
        grid: [],
        filledCount: 0,
        error: err instanceof Error ? err.message : "Couldn't parse this sheet",
      };
    }
  });

  return { sheets: results };
}

export async function createTrayFromGrid(values: TrayFormValues, grid: string[][]) {
  const userId = await requireUserId();
  const data = trayFormSchema.parse(values);
  const result = await insertTrayWithGrid(userId, data.name, data, grid);
  revalidatePath("/starters");
  return { trayId: result.trayId, imported: result.imported };
}

export async function createTraysFromSheets(
  values: TrayBatchFormValues,
  sheets: { name: string; grid: string[][] }[]
) {
  const userId = await requireUserId();
  const data = trayBatchFormSchema.parse(values);

  const created = [];
  for (const sheet of sheets) {
    created.push(await insertTrayWithGrid(userId, sheet.name, data, sheet.grid));
  }

  revalidatePath("/starters");
  return { trays: created };
}

export async function getTraysForUser() {
  const userId = await requireUserId();
  const db = getDb();

  const trays = await db.select().from(starterTrays).where(eq(starterTrays.userId, userId));
  const starters = await db
    .select({
      id: plantStarters.id,
      trayId: plantStarters.trayId,
      rowIndex: plantStarters.rowIndex,
      colIndex: plantStarters.colIndex,
      name: plantStarters.name,
      status: plantStarters.status,
      datePlanted: plantStarters.datePlanted,
    })
    .from(plantStarters)
    .where(eq(plantStarters.userId, userId));

  return trays.map((tray) => ({
    ...tray,
    starters: starters.filter((s) => s.trayId === tray.id),
  }));
}

export async function getTrayWithStarters(id: string) {
  const userId = await requireUserId();
  const db = getDb();

  const [tray] = await db
    .select()
    .from(starterTrays)
    .where(and(eq(starterTrays.id, id), eq(starterTrays.userId, userId)));
  if (!tray) return null;

  const starters = await db
    .select()
    .from(plantStarters)
    .where(eq(plantStarters.trayId, id));

  return { tray, starters };
}

export async function updateTray(id: string, values: TrayFormValues) {
  const userId = await requireUserId();
  const data = trayFormSchema.parse(values);
  const db = getDb();

  await db
    .update(starterTrays)
    .set({
      name: data.name,
      datePlanted: data.datePlanted,
      location: data.location || null,
      seedSource: data.seedSource || null,
      notes: data.notes || null,
      updatedAt: new Date(),
    })
    .where(and(eq(starterTrays.id, id), eq(starterTrays.userId, userId)));

  revalidatePath(`/starters/trays/${id}`);
  revalidatePath("/starters");
}

export async function updateTraySize(id: string, rows: number, cols: number) {
  const userId = await requireUserId();
  const db = getDb();
  const t = await getTranslations("trayEdit");

  const [tray] = await db
    .select()
    .from(starterTrays)
    .where(and(eq(starterTrays.id, id), eq(starterTrays.userId, userId)));
  if (!tray) throw new Error("Tray not found");

  if (rows === tray.rows && cols === tray.cols) return;

  const starters = await db
    .select({ rowIndex: plantStarters.rowIndex, colIndex: plantStarters.colIndex })
    .from(plantStarters)
    .where(eq(plantStarters.trayId, id));

  const maxRow = starters.reduce((m, s) => Math.max(m, s.rowIndex ?? -1), -1);
  const maxCol = starters.reduce((m, s) => Math.max(m, s.colIndex ?? -1), -1);

  if (rows <= maxRow) throw new Error(t("shrinkRowError", { row: maxRow + 1 }));
  if (cols <= maxCol) throw new Error(t("shrinkColError", { col: maxCol + 1 }));

  await db
    .update(starterTrays)
    .set({ rows, cols, updatedAt: new Date() })
    .where(eq(starterTrays.id, id));

  revalidatePath(`/starters/trays/${id}`);
  revalidatePath("/starters");
}

export type TrayCellChange = {
  rowIndex: number;
  colIndex: number;
  name: string;
  photoUrl?: string | null;
  datePlanted?: string;
};

export async function updateTrayCells(trayId: string, changes: TrayCellChange[]) {
  const userId = await requireUserId();
  const db = getDb();

  const [tray] = await db
    .select()
    .from(starterTrays)
    .where(and(eq(starterTrays.id, trayId), eq(starterTrays.userId, userId)));
  if (!tray) throw new Error("Tray not found");

  const existing = await db.select().from(plantStarters).where(eq(plantStarters.trayId, trayId));
  const existingByPosition = new Map(existing.map((s) => [`${s.rowIndex}:${s.colIndex}`, s]));

  const toCreate: TrayCellChange[] = [];
  let updated = 0;

  for (const change of changes) {
    const name = change.name.trim();
    if (!name) continue;
    const key = `${change.rowIndex}:${change.colIndex}`;
    const existingStarter = existingByPosition.get(key);
    if (existingStarter) {
      const dateChanged =
        change.datePlanted !== undefined && change.datePlanted !== existingStarter.datePlanted;
      if (existingStarter.name !== name || change.photoUrl !== undefined || dateChanged) {
        await db
          .update(plantStarters)
          .set({
            name,
            ...(change.photoUrl !== undefined ? { photoUrl: change.photoUrl || null } : {}),
            ...(dateChanged ? { datePlanted: change.datePlanted } : {}),
            updatedAt: new Date(),
          })
          .where(eq(plantStarters.id, existingStarter.id));
        updated++;
      }
    } else {
      toCreate.push({ ...change, name });
    }
  }

  if (toCreate.length > 0) {
    await db.insert(plantStarters).values(
      toCreate.map((c) => ({
        userId,
        trayId,
        rowIndex: c.rowIndex,
        colIndex: c.colIndex,
        name: c.name,
        photoUrl: c.photoUrl || null,
        datePlanted: c.datePlanted || tray.datePlanted,
        location: tray.location,
        seedSource: tray.seedSource,
        status: "seed" as const,
      }))
    );
  }

  const touchedNames = changes.map((c) => c.name).filter(Boolean);
  await ensureSeedTypes(userId, touchedNames);

  revalidatePath(`/starters/trays/${trayId}`);
  revalidatePath("/starters");
  return { updated, created: toCreate.length };
}

export async function deleteTray(id: string) {
  const userId = await requireUserId();
  const db = getDb();

  await db.delete(starterTrays).where(and(eq(starterTrays.id, id), eq(starterTrays.userId, userId)));

  revalidatePath("/starters");
}
