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
    points: values.points,
    heightM: values.heightM != null ? String(values.heightM) : null,
    radiusM: values.radiusM != null ? String(values.radiusM) : null,
  });

  revalidatePath(`/garden/${gardenId}`);
}

export async function updateShape(
  id: string,
  values: { label?: string; heightM?: number | null; radiusM?: number | null }
) {
  await requireUserId();
  const db = getDb();

  await db
    .update(gardenShapes)
    .set({
      ...(values.label !== undefined ? { label: values.label || null } : {}),
      ...(values.heightM !== undefined
        ? { heightM: values.heightM != null ? String(values.heightM) : null }
        : {}),
      ...(values.radiusM !== undefined
        ? { radiusM: values.radiusM != null ? String(values.radiusM) : null }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(gardenShapes.id, id));
}

export async function deleteShape(id: string, gardenId: string) {
  await requireUserId();
  const db = getDb();
  await db.delete(gardenShapes).where(eq(gardenShapes.id, id));
  revalidatePath(`/garden/${gardenId}`);
}

export type SunGridResult = { lat: number; lng: number; hours: number }[];

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

export async function computeGardenSunExposure(gardenId: string): Promise<SunGridResult> {
  const result = await getGardenWithShapes(gardenId);
  if (!result) throw new Error("Garden not found");
  const { garden, shapes } = result;

  const boundary = shapes.find((s) => s.type === "boundary");
  if (!boundary) throw new Error("Draw a garden boundary first");

  const origin = { lat: Number(garden.lat), lng: Number(garden.lng) };

  const obstacles: Obstacle[] = shapes
    .filter((s) => (s.type === "house" || s.type === "tree") && s.heightM)
    .map((s) => {
      if (s.type === "tree") {
        const radius = s.radiusM ? Number(s.radiusM) : DEFAULT_TREE_RADIUS_M;
        return { points: circleToPolygon(s.points[0], radius), heightM: Number(s.heightM) };
      }
      return { points: s.points, heightM: Number(s.heightM) };
    });

  const grid = buildSampleGrid(boundary.points, 12);
  const hours = computeSunHours(grid, obstacles, origin);

  return grid.map((p, i) => ({ lat: p.lat, lng: p.lng, hours: hours[i] }));
}
