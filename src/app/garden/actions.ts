"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { gardens, gardenShapes } from "@/db/schema";
import { requireUserId } from "../starters/actions";
import { buildSampleGrid, computeSunHours, type Obstacle } from "@/lib/sun-exposure";

export type GeocodeResult = { label: string; lat: number; lng: number };

/** Nominatim (OpenStreetMap) free geocoder — proxied server-side per its usage policy (custom User-Agent, no direct client calls). */
export async function geocodeAddress(query: string): Promise<GeocodeResult[]> {
  await requireUserId();
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", trimmed);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");

  const res = await fetch(url, {
    headers: { "User-Agent": "garden-planning-and-monitoring (personal use)" },
  });
  if (!res.ok) throw new Error("Address search failed");

  const results = (await res.json()) as { display_name: string; lat: string; lon: string }[];
  return results.map((r) => ({
    label: r.display_name,
    lat: Number(r.lat),
    lng: Number(r.lon),
  }));
}

export async function createGarden(values: { name: string; addressLabel: string; lat: number; lng: number }) {
  const userId = await requireUserId();
  const db = getDb();

  const [garden] = await db
    .insert(gardens)
    .values({
      userId,
      name: values.name,
      addressLabel: values.addressLabel || null,
      lat: String(values.lat),
      lng: String(values.lng),
    })
    .returning({ id: gardens.id });

  revalidatePath("/garden");
  return { gardenId: garden.id };
}

export async function getGardensForUser() {
  const userId = await requireUserId();
  const db = getDb();
  return db.select().from(gardens).where(eq(gardens.userId, userId));
}

export async function getGardenWithShapes(id: string) {
  const userId = await requireUserId();
  const db = getDb();

  const [garden] = await db
    .select()
    .from(gardens)
    .where(and(eq(gardens.id, id), eq(gardens.userId, userId)));
  if (!garden) return null;

  const shapes = await db.select().from(gardenShapes).where(eq(gardenShapes.gardenId, id));
  return { garden, shapes };
}

export async function renameGarden(id: string, name: string) {
  const userId = await requireUserId();
  const db = getDb();
  await db
    .update(gardens)
    .set({ name, updatedAt: new Date() })
    .where(and(eq(gardens.id, id), eq(gardens.userId, userId)));
  revalidatePath(`/garden/${id}`);
  revalidatePath("/garden");
}

export async function updateGardenLocation(
  id: string,
  values: { addressLabel: string; lat: number; lng: number }
) {
  const userId = await requireUserId();
  const db = getDb();
  await db
    .update(gardens)
    .set({
      addressLabel: values.addressLabel || null,
      lat: String(values.lat),
      lng: String(values.lng),
      updatedAt: new Date(),
    })
    .where(and(eq(gardens.id, id), eq(gardens.userId, userId)));
  revalidatePath(`/garden/${id}`);
  revalidatePath("/garden");
}

export async function updateGardenCoordinates(id: string, lat: number, lng: number) {
  const userId = await requireUserId();
  const db = getDb();
  await db
    .update(gardens)
    .set({ lat: String(lat), lng: String(lng), updatedAt: new Date() })
    .where(and(eq(gardens.id, id), eq(gardens.userId, userId)));
  revalidatePath(`/garden/${id}`);
}

export async function deleteGarden(id: string) {
  const userId = await requireUserId();
  const db = getDb();
  await db.delete(gardens).where(and(eq(gardens.id, id), eq(gardens.userId, userId)));
  revalidatePath("/garden");
}

export type ShapeType = "boundary" | "house" | "tree" | "vegetable_plot" | "green_patch";

export async function createShape(
  gardenId: string,
  values: {
    type: ShapeType;
    label?: string;
    color?: string | null;
    points: { lat: number; lng: number }[];
    heightM?: number | null;
    radiusM?: number | null;
  }
) {
  const userId = await requireUserId();
  const db = getDb();

  const [garden] = await db
    .select({ id: gardens.id })
    .from(gardens)
    .where(and(eq(gardens.id, gardenId), eq(gardens.userId, userId)));
  if (!garden) throw new Error("Garden not found");

  await db.insert(gardenShapes).values({
    gardenId,
    type: values.type,
    label: values.label || null,
    color: values.color || null,
    points: values.points,
    heightM: values.heightM != null ? String(values.heightM) : null,
    radiusM: values.radiusM != null ? String(values.radiusM) : null,
  });

  revalidatePath(`/garden/${gardenId}`);
}

async function requireOwnedShape(id: string, userId: string) {
  const db = getDb();
  const [row] = await db
    .select({ id: gardenShapes.id, gardenId: gardenShapes.gardenId })
    .from(gardenShapes)
    .innerJoin(gardens, eq(gardenShapes.gardenId, gardens.id))
    .where(and(eq(gardenShapes.id, id), eq(gardens.userId, userId)));
  if (!row) throw new Error("Shape not found");
  return row;
}

export async function updateShape(
  id: string,
  values: {
    label?: string;
    color?: string | null;
    heightM?: number | null;
    radiusM?: number | null;
    points?: { lat: number; lng: number }[];
  }
) {
  const userId = await requireUserId();
  const { gardenId } = await requireOwnedShape(id, userId);
  const db = getDb();

  await db
    .update(gardenShapes)
    .set({
      ...(values.label !== undefined ? { label: values.label || null } : {}),
      ...(values.color !== undefined ? { color: values.color || null } : {}),
      ...(values.heightM !== undefined
        ? { heightM: values.heightM != null ? String(values.heightM) : null }
        : {}),
      ...(values.radiusM !== undefined
        ? { radiusM: values.radiusM != null ? String(values.radiusM) : null }
        : {}),
      ...(values.points !== undefined ? { points: values.points } : {}),
      updatedAt: new Date(),
    })
    .where(eq(gardenShapes.id, id));
  revalidatePath(`/garden/${gardenId}`);
}

export async function deleteShape(id: string, gardenId: string) {
  const userId = await requireUserId();
  await requireOwnedShape(id, userId);
  const db = getDb();
  await db.delete(gardenShapes).where(eq(gardenShapes.id, id));
  revalidatePath(`/garden/${gardenId}`);
}

export type SunGridPoint = { lat: number; lng: number; hours: number };
export type SunExposureResult = {
  points: SunGridPoint[];
  /** Average sun hours/day per shape id (only trees and vegetable plots). */
  shapeAverages: Record<string, number>;
};

const DEFAULT_TREE_RADIUS_M = 1.5;

function circleToPolygon(center: { lat: number; lng: number }, radiusM: number): { lat: number; lng: number }[] {
  const metersPerDegLat = 111_320;
  const metersPerDegLng = 111_320 * Math.cos((center.lat * Math.PI) / 180);
  const points: { lat: number; lng: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * 2 * Math.PI;
    points.push({
      lat: center.lat + (radiusM * Math.cos(angle)) / metersPerDegLat,
      lng: center.lng + (radiusM * Math.sin(angle)) / metersPerDegLng,
    });
  }
  return points;
}

export async function computeGardenSunExposure(gardenId: string): Promise<SunExposureResult> {
  const result = await getGardenWithShapes(gardenId);
  if (!result) throw new Error("Garden not found");
  const { garden, shapes } = result;

  const boundary = shapes.find((s) => s.type === "boundary");
  if (!boundary) throw new Error("Draw a garden boundary first");

  const origin = { lat: Number(garden.lat), lng: Number(garden.lng) };

  const obstacleShapes = shapes.filter(
    (s) => (s.type === "house" || s.type === "tree") && s.heightM
  );
  function toObstacle(s: (typeof obstacleShapes)[number]): Obstacle {
    if (s.type === "tree") {
      const radius = s.radiusM ? Number(s.radiusM) : DEFAULT_TREE_RADIUS_M;
      return { points: circleToPolygon(s.points[0], radius), heightM: Number(s.heightM) };
    }
    return { points: s.points, heightM: Number(s.heightM) };
  }

  // Only sample where it's actually useful for planning — trees and
  // vegetable plots — rather than the whole boundary (which usually also
  // covers the house footprint, patios, and paths).
  const targets = shapes.filter((s) => s.type === "tree" || s.type === "vegetable_plot");
  const points: SunGridPoint[] = [];
  const shapeAverages: Record<string, number> = {};

  for (const target of targets) {
    const targetPoints =
      target.type === "tree"
        ? circleToPolygon(
            target.points[0],
            target.radiusM ? Number(target.radiusM) : DEFAULT_TREE_RADIUS_M
          )
        : target.points;
    const grid = buildSampleGrid(targetPoints, target.type === "tree" ? 6 : 12);
    // A tree's shadow hull always covers its own footprint (it's the convex
    // hull of the footprint and its shifted copy), so a tree can never
    // register sun on itself in this model — exclude it from its own
    // obstacle list while still shading it with every other obstacle.
    const obstacles = obstacleShapes.filter((s) => s.id !== target.id).map(toObstacle);
    const hours = computeSunHours(grid, obstacles, origin);
    grid.forEach((p, i) => points.push({ lat: p.lat, lng: p.lng, hours: hours[i] }));
    shapeAverages[target.id] = hours.length
      ? hours.reduce((sum, h) => sum + h, 0) / hours.length
      : 0;
  }

  return { points, shapeAverages };
}
