import * as SunCalc from "suncalc";
import * as turf from "@turf/turf";

export type LatLng = { lat: number; lng: number };

export type Obstacle = {
  /**
   * Footprint in lat/lng — a closed or open ring of vertices. A point's own
   * heightM (e.g. a house corner on the low side of a sloped roof) overrides
   * the obstacle's flat heightM below for that corner only.
   */
  points: (LatLng & { heightM?: number })[];
  /** Height in meters, used for any point that doesn't specify its own. */
  heightM: number;
};

const EARTH_RADIUS_M = 6_371_000;
/** Ignore samples this close to the horizon — shadows become absurdly long and mostly meaningless for garden planning. */
const MIN_ALTITUDE_DEG = 2;
/** Representative day of each month, a standard simplification for a yearly average (12 samples instead of 365). */
const SAMPLE_DAY_OF_MONTH = 15;
const SAMPLE_INTERVAL_MINUTES = 30;

function toLocalMeters(point: LatLng, origin: LatLng): { x: number; y: number } {
  const originLatRad = (origin.lat * Math.PI) / 180;
  const y = ((point.lat - origin.lat) * Math.PI) / 180 * EARTH_RADIUS_M;
  const x = (((point.lng - origin.lng) * Math.PI) / 180) * EARTH_RADIUS_M * Math.cos(originLatRad);
  return { x, y };
}

/** Builds a rectangular grid of sample points clipped to the boundary polygon. */
export function buildSampleGrid(boundary: LatLng[], resolution = 12): LatLng[] {
  const ring = [...boundary, boundary[0]].map((p) => [p.lng, p.lat] as [number, number]);
  const polygon = turf.polygon([ring]);
  const bbox = turf.bbox(polygon);
  const [minLng, minLat, maxLng, maxLat] = bbox;

  const points: LatLng[] = [];
  for (let i = 0; i < resolution; i++) {
    for (let j = 0; j < resolution; j++) {
      const lng = minLng + ((i + 0.5) / resolution) * (maxLng - minLng);
      const lat = minLat + ((j + 0.5) / resolution) * (maxLat - minLat);
      if (turf.booleanPointInPolygon([lng, lat], polygon)) {
        points.push({ lat, lng });
      }
    }
  }
  return points;
}

/**
 * Andrew's monotone chain convex hull. Used instead of @turf/convex (which
 * delegates to the `concaveman` package): concaveman reliably threw
 * "TypeError: d is not a constructor" under Turbopack's production
 * minifier — reproduced identically on a clean local `next build` and on
 * Vercel, traced via the build's source map to concaveman's internals, not
 * to our own code. Our inputs here are always small (a handful of points),
 * so a self-contained hull avoids the dependency entirely rather than
 * fighting whatever the minifier does to that package.
 */
function convexHull(
  points: { x: number; y: number }[]
): { x: number; y: number }[] {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (sorted.length <= 2) return sorted;

  const cross = (
    o: { x: number; y: number },
    a: { x: number; y: number },
    b: { x: number; y: number }
  ) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const lower: { x: number; y: number }[] = [];
  for (const p of sorted) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    ) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: { x: number; y: number }[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    ) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/**
 * The ground shadow of an extruded obstacle isn't just its footprint
 * translated by the shadow vector — that's only the far tip. The full
 * shadow is the swept region connecting the base to the tip, which for a
 * convex footprint is the convex hull of the footprint and its shifted
 * copy. Each point shifts by its own shadow length (from its own height),
 * not one length for the whole footprint — a flat roof (every point the
 * same height) reduces to the old uniform-shift behavior, while a sloped
 * one (points at different heights, e.g. a house's eave vs. ridge corners)
 * naturally produces a sheared, non-uniform shadow shape.
 */
function shadowHull(
  footprintLocal: { x: number; y: number; heightM: number }[],
  altitudeRad: number,
  shadowDirX: number,
  shadowDirY: number
): { x: number; y: number }[] {
  const shifted = footprintLocal.map((p) => {
    const length = p.heightM / Math.tan(altitudeRad);
    return { x: p.x + length * shadowDirX, y: p.y + length * shadowDirY };
  });
  const base = footprintLocal.map(({ x, y }) => ({ x, y }));
  return convexHull([...base, ...shifted]);
}

function pointInLocalPolygon(
  point: { x: number; y: number },
  polygon: { x: number; y: number }[]
): boolean {
  if (polygon.length < 3) return false;
  const ring = [...polygon, polygon[0]].map((p) => [p.x, p.y] as [number, number]);
  return turf.booleanPointInPolygon([point.x, point.y], turf.polygon([ring]));
}

/**
 * Average daily sun hours at each sample point across a representative year,
 * accounting for real shadows cast by the given obstacles (house, trees).
 */
export function computeSunHours(
  samplePoints: LatLng[],
  obstacles: Obstacle[],
  origin: LatLng
): number[] {
  const localObstacles = obstacles
    .filter((o) => o.points.length >= 3 && o.heightM > 0)
    .map((o) => ({
      footprint: o.points.map((p) => ({
        ...toLocalMeters(p, origin),
        heightM: p.heightM ?? o.heightM,
      })),
    }));

  const localPoints = samplePoints.map((p) => toLocalMeters(p, origin));
  const sunHoursPerDay: number[][] = samplePoints.map(() => []);

  for (let month = 0; month < 12; month++) {
    const sampleDate = new Date(Date.UTC(new Date().getUTCFullYear(), month, SAMPLE_DAY_OF_MONTH));
    const times = SunCalc.getTimes(sampleDate, origin.lat, origin.lng);
    if (!times.sunrise || !times.sunset || Number.isNaN(times.sunrise.getTime())) continue;

    const sunlitCount = new Array(samplePoints.length).fill(0);
    let sampleCount = 0;

    for (
      let t = times.sunrise.getTime();
      t <= times.sunset.getTime();
      t += SAMPLE_INTERVAL_MINUTES * 60_000
    ) {
      const date = new Date(t);
      const { altitude, azimuth } = SunCalc.getPosition(date, origin.lat, origin.lng);
      if (altitude < MIN_ALTITUDE_DEG) continue;
      sampleCount++;

      const shadowBearingRad = ((azimuth + 180) * Math.PI) / 180;
      const shadowDirX = Math.sin(shadowBearingRad);
      const shadowDirY = Math.cos(shadowBearingRad);

      const altitudeRad = (altitude * Math.PI) / 180;
      const shadowPolygons = localObstacles.map((o) =>
        shadowHull(o.footprint, altitudeRad, shadowDirX, shadowDirY)
      );

      for (let i = 0; i < localPoints.length; i++) {
        const inShadow = shadowPolygons.some((poly) => pointInLocalPolygon(localPoints[i], poly));
        if (!inShadow) sunlitCount[i]++;
      }
    }

    if (sampleCount === 0) continue;
    const hoursPerSample = SAMPLE_INTERVAL_MINUTES / 60;
    for (let i = 0; i < samplePoints.length; i++) {
      sunHoursPerDay[i].push(sunlitCount[i] * hoursPerSample);
    }
  }

  return sunHoursPerDay.map((days) =>
    days.length === 0 ? 0 : days.reduce((sum, h) => sum + h, 0) / days.length
  );
}
