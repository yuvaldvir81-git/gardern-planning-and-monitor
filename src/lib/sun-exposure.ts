import * as SunCalc from "suncalc";
import * as turf from "@turf/turf";

export type LatLng = { lat: number; lng: number };

export type Obstacle = {
  /** Footprint in lat/lng — a closed or open ring of vertices. */
  points: LatLng[];
  /** Height in meters. */
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

function shiftPolygonMeters(
  footprintLocal: { x: number; y: number }[],
  dx: number,
  dy: number
): { x: number; y: number }[] {
  return footprintLocal.map((p) => ({ x: p.x + dx, y: p.y + dy }));
}

/**
 * The ground shadow of an extruded flat-topped obstacle isn't just its
 * footprint translated by the shadow vector — that's only the far tip. The
 * full shadow is the swept region connecting the base to the tip, which for
 * a convex footprint is the convex hull of the footprint and its translated
 * copy.
 */
function shadowHull(
  footprintLocal: { x: number; y: number }[],
  dx: number,
  dy: number
): { x: number; y: number }[] {
  const translated = shiftPolygonMeters(footprintLocal, dx, dy);
  const points = turf.featureCollection(
    [...footprintLocal, ...translated].map((p) => turf.point([p.x, p.y]))
  );
  const hull = turf.convex(points);
  if (!hull) return translated;
  return hull.geometry.coordinates[0].map(([x, y]) => ({ x, y }));
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
      footprint: o.points.map((p) => toLocalMeters(p, origin)),
      heightM: o.heightM,
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

      const shadowPolygons = localObstacles.map((o) => {
        const length = o.heightM / Math.tan((altitude * Math.PI) / 180);
        return shadowHull(o.footprint, length * shadowDirX, length * shadowDirY);
      });

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
