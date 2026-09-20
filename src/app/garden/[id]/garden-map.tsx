"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import "@geoman-io/leaflet-geoman-free";
import {
  MapContainer,
  TileLayer,
  Polygon,
  Circle,
  CircleMarker,
  useMap,
} from "react-leaflet";
import {
  Sprout,
  Home,
  TreePine,
  Sun,
  Trash2,
  Square,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createShape,
  deleteShape,
  computeGardenSunExposure,
  type ShapeType,
  type SunGridResult,
} from "../actions";
import type { gardens, gardenShapes } from "@/db/schema";
import { MapErrorBoundary } from "./map-error-boundary";

// Leaflet's default marker icon paths break under bundlers — point at the CDN instead.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

type Garden = typeof gardens.$inferSelect;
type Shape = typeof gardenShapes.$inferSelect;

const SHAPE_COLORS: Record<ShapeType, string> = {
  boundary: "#94a3b8",
  house: "#78716c",
  tree: "#16a34a",
  vegetable_plot: "#ea580c",
  green_patch: "#4ade80",
};

const DEFAULT_TREE_RADIUS_M = 1.5;

function sunHoursColor(hours: number): string {
  // 0h -> blue-gray (shade), 12h -> warm yellow (full sun)
  const clamped = Math.max(0, Math.min(12, hours));
  const t = clamped / 12;
  const hue = 220 - t * 170; // 220 (blue) -> 50 (yellow)
  return `hsl(${hue}, 70%, 55%)`;
}

function extractPolygonPoints(layer: L.Layer): { lat: number; lng: number }[] {
  const latLngs = (layer as L.Polygon).getLatLngs();
  const ring = (Array.isArray(latLngs[0]) ? latLngs[0] : latLngs) as L.LatLng[];
  return ring.map((p) => ({ lat: p.lat, lng: p.lng }));
}

type PendingShape = {
  type: ShapeType;
  points: { lat: number; lng: number }[];
};

function MapEvents({
  onReady,
  onCreate,
}: {
  onReady: (map: L.Map) => void;
  onCreate: (shape: PendingShape) => void;
}) {
  const map = useMap();

  useEffect(() => {
    onReady(map);
  }, [map, onReady]);

  useEffect(() => {
    function handleCreate(e: L.LeafletEvent) {
      const { shape, layer } = e as L.LeafletEvent & {
        shape: string;
        layer: L.Layer;
      };
      const drawType = (map as L.Map & { _pendingShapeType?: ShapeType })
        ._pendingShapeType;
      if (!drawType) return;

      const points =
        shape === "Marker"
          ? [
              {
                lat: (layer as L.Marker).getLatLng().lat,
                lng: (layer as L.Marker).getLatLng().lng,
              },
            ]
          : extractPolygonPoints(layer);

      map.removeLayer(layer);
      onCreate({ type: drawType, points });
    }

    map.on("pm:create", handleCreate);
    return () => {
      map.off("pm:create", handleCreate);
    };
  }, [map, onCreate]);

  return null;
}

export function GardenMap({
  garden,
  shapes,
}: {
  garden: Garden;
  shapes: Shape[];
}) {
  const t = useTranslations("garden");
  const router = useRouter();
  const mapRef = useRef<L.Map | null>(null);
  const [pendingShape, setPendingShape] = useState<PendingShape | null>(null);
  const [labelInput, setLabelInput] = useState("");
  const [heightInput, setHeightInput] = useState("");
  const [radiusInput, setRadiusInput] = useState(String(DEFAULT_TREE_RADIUS_M));
  const [isSaving, setIsSaving] = useState(false);
  const [sunGrid, setSunGrid] = useState<SunGridResult | null>(null);
  const [isComputingSun, setIsComputingSun] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  useEffect(() => {
    function handleError(e: ErrorEvent) {
      setGlobalError(e.message || String(e.error));
    }
    function handleRejection(e: PromiseRejectionEvent) {
      setGlobalError(String(e.reason?.message ?? e.reason));
    }
    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  function startDraw(type: ShapeType) {
    const map = mapRef.current;
    if (!map) return;
    (map as L.Map & { _pendingShapeType?: ShapeType })._pendingShapeType = type;
    if (type === "tree") {
      map.pm.enableDraw("Marker");
    } else {
      map.pm.enableDraw("Polygon");
    }
  }

  function handleCreate(shape: PendingShape) {
    setPendingShape(shape);
    setLabelInput("");
    setHeightInput(shape.type === "house" ? "6" : "4");
    setRadiusInput(String(DEFAULT_TREE_RADIUS_M));
  }

  async function confirmPendingShape() {
    if (!pendingShape) return;
    setIsSaving(true);
    try {
      await createShape(garden.id, {
        type: pendingShape.type,
        label: labelInput,
        points: pendingShape.points,
        heightM:
          pendingShape.type === "house" || pendingShape.type === "tree"
            ? Number(heightInput) || null
            : null,
        radiusM:
          pendingShape.type === "tree"
            ? Number(radiusInput) || DEFAULT_TREE_RADIUS_M
            : null,
      });
      toast.success(t("toastShapeAdded"));
      setPendingShape(null);
      router.refresh();
    } catch {
      toast.error(t("sunComputeError"));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteShape(id: string) {
    try {
      await deleteShape(id, garden.id);
      toast.success(t("toastShapeDeleted"));
      router.refresh();
    } catch {
      // no-op — action already logs server-side
    }
  }

  async function handleComputeSun() {
    setIsComputingSun(true);
    try {
      const result = await computeGardenSunExposure(garden.id);
      setSunGrid(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("sunComputeError"));
    } finally {
      setIsComputingSun(false);
    }
  }

  const shapeLabels: Record<ShapeType, string> = {
    boundary: t("shapeBoundary"),
    house: t("shapeHouse"),
    tree: t("shapeTree"),
    vegetable_plot: t("shapeVegetablePlot"),
    green_patch: t("shapeGreenPatch"),
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      {globalError && (
        <div className="rounded-md border-2 border-red-500 bg-red-950 p-3 text-sm text-red-200 lg:col-span-2">
          Global error caught: {globalError}
        </div>
      )}
      <MapErrorBoundary>
        <div className="h-[60vh] overflow-hidden rounded-lg border-4 border-yellow-400 lg:h-[75vh]">
          <div className="bg-yellow-400 px-2 py-0.5 text-xs font-bold text-black">
            MAP CONTAINER SENTINEL
          </div>
          <MapContainer
            center={[Number(garden.lat), Number(garden.lng)]}
            zoom={20}
            maxZoom={22}
            className="h-full w-full"
          >
            <TileLayer
              attribution="Tiles &copy; Esri"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={22}
              maxNativeZoom={19}
            />
            <MapEvents
              onReady={(map) => (mapRef.current = map)}
              onCreate={handleCreate}
            />

            {shapes.map((shape) => {
              const color = SHAPE_COLORS[shape.type];
              if (shape.type === "tree") {
                const center = shape.points[0];
                const radius = shape.radiusM
                  ? Number(shape.radiusM)
                  : DEFAULT_TREE_RADIUS_M;
                return (
                  <Circle
                    key={shape.id}
                    center={[center.lat, center.lng]}
                    radius={radius}
                    pathOptions={{ color, fillColor: color, fillOpacity: 0.6 }}
                  />
                );
              }
              return (
                <Polygon
                  key={shape.id}
                  positions={shape.points.map((p) => [p.lat, p.lng])}
                  pathOptions={{
                    color,
                    fillColor: color,
                    fillOpacity: shape.type === "boundary" ? 0 : 0.3,
                    dashArray: shape.type === "boundary" ? "6 6" : undefined,
                  }}
                />
              );
            })}

            {sunGrid?.map((cell, i) => (
              <CircleMarker
                key={i}
                center={[cell.lat, cell.lng]}
                radius={10}
                pathOptions={{
                  color: sunHoursColor(cell.hours),
                  fillColor: sunHoursColor(cell.hours),
                  fillOpacity: 0.55,
                  stroke: false,
                }}
              />
            ))}
          </MapContainer>
        </div>
      </MapErrorBoundary>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("shapesTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => startDraw("boundary")}
              >
                <Square className="h-4 w-4" />
                {t("drawBoundary")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => startDraw("house")}
              >
                <Home className="h-4 w-4" />
                {t("drawHouse")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => startDraw("tree")}
              >
                <TreePine className="h-4 w-4" />
                {t("drawTree")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => startDraw("vegetable_plot")}
              >
                <Sprout className="h-4 w-4" />
                {t("drawPlot")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="col-span-2"
                onClick={() => startDraw("green_patch")}
              >
                <Sprout className="h-4 w-4" />
                {t("drawPatch")}
              </Button>
            </div>

            <div className="border-t pt-2">
              {shapes.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t("noShapes")}</p>
              ) : (
                <ul className="space-y-1">
                  {shapes.map((shape) => (
                    <li
                      key={shape.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="flex items-center gap-1.5">
                        <span
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: SHAPE_COLORS[shape.type] }}
                        />
                        {shape.label || shapeLabels[shape.type]}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t("deleteShapeAriaLabel")}
                        onClick={() => handleDeleteShape(shape.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2 pt-4">
            <Button
              className="w-full"
              onClick={handleComputeSun}
              disabled={isComputingSun}
            >
              {isComputingSun ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
              {isComputingSun ? t("computingSun") : t("computeSun")}
            </Button>
            {sunGrid && (
              <>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setSunGrid(null)}
                >
                  {t("hideSun")}
                </Button>
                <p className="text-xs text-muted-foreground">
                  {t("sunHoursLegend")}
                </p>
                <div
                  className="h-2 w-full rounded-full"
                  style={{
                    background: `linear-gradient(to right, ${sunHoursColor(0)}, ${sunHoursColor(6)}, ${sunHoursColor(12)})`,
                  }}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={pendingShape !== null}
        onOpenChange={(next) => !next && setPendingShape(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {pendingShape &&
                t("newShapeTitle", { type: shapeLabels[pendingShape.type] })}
            </DialogTitle>
            <DialogDescription />
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="shape-label">{t("label")}</Label>
              <Input
                id="shape-label"
                placeholder={t("labelPlaceholder")}
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
              />
            </div>
            {(pendingShape?.type === "house" ||
              pendingShape?.type === "tree") && (
              <div className="grid gap-2">
                <Label htmlFor="shape-height">{t("heightM")}</Label>
                <Input
                  id="shape-height"
                  type="number"
                  step="0.1"
                  value={heightInput}
                  onChange={(e) => setHeightInput(e.target.value)}
                />
              </div>
            )}
            {pendingShape?.type === "tree" && (
              <div className="grid gap-2">
                <Label htmlFor="shape-radius">{t("radiusM")}</Label>
                <Input
                  id="shape-radius"
                  type="number"
                  step="0.1"
                  value={radiusInput}
                  onChange={(e) => setRadiusInput(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingShape(null)}
              disabled={isSaving}
            >
              {t("cancel")}
            </Button>
            <Button onClick={confirmPendingShape} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
