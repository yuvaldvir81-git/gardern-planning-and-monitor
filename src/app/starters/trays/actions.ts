"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { plantStarters, starterTrays } from "@/db/schema";
import { requireUserId } from "../actions";
import { trayFormSchema, type TrayFormValues } from "@/lib/validations";
import { extractGrid, readSheetTable } from "@/lib/spreadsheet";

const MAX_CELLS = 500;

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
  const cellCount = grid.reduce((sum, row) => sum + row.filter((c) => c).length, 0);
  if (cellCount > MAX_CELLS) {
    throw new Error(`This sheet has ${cellCount} filled cells — the limit is ${MAX_CELLS}.`);
  }

  return { needsSheetSelection: false as const, grid };
}

export async function createTrayFromGrid(values: TrayFormValues, grid: string[][]) {
  const userId = await requireUserId();
  const data = trayFormSchema.parse(values);
  const db = getDb();

  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;
  if (rows === 0 || cols === 0) throw new Error("The grid is empty");

  const [tray] = await db
    .insert(starterTrays)
    .values({
      userId,
      name: data.name,
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
  }

  revalidatePath("/starters");
  return { trayId: tray.id, imported: cells.length };
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

export async function deleteTray(id: string) {
  const userId = await requireUserId();
  const db = getDb();

  await db.delete(starterTrays).where(and(eq(starterTrays.id, id), eq(starterTrays.userId, userId)));

  revalidatePath("/starters");
}
