"use server";

import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { plantStarters, starterTrays, seedTypes } from "@/db/schema";
import { requireUserId } from "./actions";

export type ReplantScheduleEntry = {
  starterId: string;
  name: string;
  trayId: string | null;
  trayName: string | null;
  rowIndex: number | null;
  colIndex: number | null;
  datePlanted: string;
  status: string;
  /** null when the seed type has no transplant-timing metadata generated yet. */
  daysUntilReadyMin: number | null;
  daysUntilReadyMax: number | null;
};

function addDays(dateStr: string, days: number): Date {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

/**
 * Every non-transplanted starter, in the order it should be moved out of its
 * tray next — earliest (or most overdue) expected-ready date first. Computed
 * live from date_planted + the seed type's daysToTransplant range, so it's
 * always current with no caching/cron needed: this is cheap date arithmetic
 * over already-loaded rows, not an expensive external call like the AI
 * metadata generation it depends on.
 */
export async function getReplantSchedule(): Promise<ReplantScheduleEntry[]> {
  const userId = await requireUserId();
  const db = getDb();

  const starters = await db
    .select({
      id: plantStarters.id,
      name: plantStarters.name,
      trayId: plantStarters.trayId,
      rowIndex: plantStarters.rowIndex,
      colIndex: plantStarters.colIndex,
      datePlanted: plantStarters.datePlanted,
      status: plantStarters.status,
    })
    .from(plantStarters)
    .where(
      and(
        eq(plantStarters.userId, userId),
        inArray(plantStarters.status, ["seed", "germinating", "seedling"])
      )
    );

  if (starters.length === 0) return [];

  const trayIds = Array.from(new Set(starters.map((s) => s.trayId).filter((id) => id !== null)));
  const trays =
    trayIds.length > 0
      ? await db
          .select({ id: starterTrays.id, name: starterTrays.name })
          .from(starterTrays)
          .where(inArray(starterTrays.id, trayIds))
      : [];
  const trayNameById = new Map(trays.map((t) => [t.id, t.name]));

  const names = Array.from(new Set(starters.map((s) => s.name)));
  const metadata = await db
    .select({
      name: seedTypes.name,
      daysToTransplantMin: seedTypes.daysToTransplantMin,
      daysToTransplantMax: seedTypes.daysToTransplantMax,
    })
    .from(seedTypes)
    .where(and(eq(seedTypes.userId, userId), inArray(seedTypes.name, names)));
  const metaByName = new Map(metadata.map((m) => [m.name, m]));

  const today = new Date();
  const entries: ReplantScheduleEntry[] = starters.map((s) => {
    const meta = metaByName.get(s.name);
    const daysUntilReadyMin =
      meta?.daysToTransplantMin != null
        ? daysBetween(today, addDays(s.datePlanted, meta.daysToTransplantMin))
        : null;
    const daysUntilReadyMax =
      meta?.daysToTransplantMax != null
        ? daysBetween(today, addDays(s.datePlanted, meta.daysToTransplantMax))
        : null;

    return {
      starterId: s.id,
      name: s.name,
      trayId: s.trayId,
      trayName: s.trayId ? (trayNameById.get(s.trayId) ?? null) : null,
      rowIndex: s.rowIndex,
      colIndex: s.colIndex,
      datePlanted: s.datePlanted,
      status: s.status,
      daysUntilReadyMin,
      daysUntilReadyMax,
    };
  });

  entries.sort((a, b) => {
    if (a.daysUntilReadyMin === null && b.daysUntilReadyMin === null) return 0;
    if (a.daysUntilReadyMin === null) return 1;
    if (b.daysUntilReadyMin === null) return -1;
    return a.daysUntilReadyMin - b.daysUntilReadyMin;
  });

  return entries;
}
