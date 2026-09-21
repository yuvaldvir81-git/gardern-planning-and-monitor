"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import L from "leaflet";
// CSS is imported globally in src/app/layout.tsx instead of here — see the
// comment there for why (production-only blank map on a lazily loaded chunk).
import "@geoman-io/leaflet-geoman-free";
import {
  MapContainer,
  TileLayer,
  LayersControl,
  Marker,
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
  Pencil,
  Move,
  Eye,
  EyeOff,
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
import { Slider } from "@/components/ui/slider";
import {
  createShape,
  updateShape,
  deleteShape,
  computeGardenSunExposure,
  updateGardenCoordinates,
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

type PmLayer = L.Layer & {
  pm: {
    enable: (options?: Record<string, unknown>) => void;
    disable: () => void;
    enableLayerDrag: () => void;
    disableLayerDrag: () => void;
  };
};

function EditableShapeLayer({
  shape,
  editMode,
  opacity,
  resetKey,
  onGeometryChange,
}: {
  shape: Shape;
  editMode: boolean;
  opacity: number;
  resetKey: number;
  onGeometryChange: (id: string, points: { lat: number; lng: number }[]) => void;
}) {
  const layerRef = useRef<L.Polygon | L.Circle | null>(null);

  useEffect(() => {
    const layer = layerRef.current as PmLayer | null;
    if (!layer?.pm) return;
    if (editMode) {
      layer.pm.enable({ allowSelfIntersection: false });
      layer.pm.enableLayerDrag();
    } else {
      layer.pm.disable();
      layer.pm.disableLayerDrag();
    }
  }, [editMode]);

  function handleChange() {
    const layer = layerRef.current;
    if (!layer) return;
    if (shape.type === "tree") {
      const center = (layer as L.Circle).getLatLng();
      onGeometryChange(shape.id, [{ lat: center.lat, lng: center.lng }]);
    } else {
      onGeometryChange(shape.id, extractPolygonPoints(layer as L.Layer));
    }
  }

  const color = SHAPE_COLORS[shape.type];
  const eventHandlers = {
    "pm:dragend": handleChange,
    "pm:edit": handleChange,
    "pm:markerdragend": handleChange,
  };

  if (shape.type === "tree") {
    const center = shape.points[0];
    const radius = shape.radiusM ? Number(shape.radiusM) : DEFAULT_TREE_RADIUS_M;
    return (
      <Circle
        key={`${shape.id}-${resetKey}`}
        ref={layerRef as React.RefObject<L.Circle>}
        center={[center.lat, center.lng]}
        radius={radius}
        pathOptions={{ color, fillColor: color, fillOpacity: opacity }}
        eventHandlers={eventHandlers}
      />
    );
  }

  return (
    <Polygon
      key={`${shape.id}-${resetKey}`}
      ref={layerRef as React.RefObject<L.Polygon>}
      positions={shape.points.map((p) => [p.lat, p.lng])}
      pathOptions={{
        color,
        fillColor: color,
        fillOpacity: opacity,
        dashArray: shape.type === "boundary" ? "6 6" : undefined,
      }}
      eventHandlers={eventHandlers}
    />
  );
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
  const [editingShape, setEditingShape] = useState<Shape | null>(null);
  const [editLabelInput, setEditLabelInput] = useState("");
  const [editHeightInput, setEditHeightInput] = useState("");
  const [editRadiusInput, setEditRadiusInput] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const savedPosition: [number, number] = [Number(garden.lat), Number(garden.lng)];
  const [markerPosition, setMarkerPosition] = useState<[number, number]>(savedPosition);
  const [isSavingPosition, setIsSavingPosition] = useState(false);
  const positionMoved =
    markerPosition[0] !== savedPosition[0] || markerPosition[1] !== savedPosition[1];
  const [hiddenShapeIds, setHiddenShapeIds] = useState<Set<string>>(new Set());
  const [shapeOpacity, setShapeOpacity] = useState<Record<string, number>>({});
  const [editPositionsMode, setEditPositionsMode] = useState(false);
  const [shapeOverrides, setShapeOverrides] = useState<
    Record<string, { lat: number; lng: number }[]>
  >({});
  const [isSavingShapes, setIsSavingShapes] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  function defaultOpacity(type: ShapeType) {
    if (type === "boundary") return 0;
    if (type === "tree") return 0.6;
    return 0.3;
  }

  function getOpacity(shape: Shape) {
    return shapeOpacity[shape.id] ?? defaultOpacity(shape.type);
  }

  function toggleVisibility(id: string) {
    setHiddenShapeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleGeometryChange(id: string, points: { lat: number; lng: number }[]) {
    setShapeOverrides((prev) => ({ ...prev, [id]: points }));
  }

  async function handleSaveShapePositions() {
    setIsSavingShapes(true);
    try {
      await Promise.all(
        Object.entries(shapeOverrides).map(([id, points]) => updateShape(id, { points }))
      );
      toast.success(t("toastShapesRepositioned"));
      setShapeOverrides({});
      setEditPositionsMode(false);
      setResetKey((k) => k + 1);
      router.refresh();
    } catch {
      toast.error(t("sunComputeError"));
    } finally {
      setIsSavingShapes(false);
    }
  }

  function handleCancelShapePositions() {
    setShapeOverrides({});
    setEditPositionsMode(false);
    setResetKey((k) => k + 1);
  }

  async function handleSavePosition() {
    setIsSavingPosition(true);
    try {
      await updateGardenCoordinates(garden.id, markerPosition[0], markerPosition[1]);
      toast.success(t("toastAddressUpdated"));
      router.refresh();
    } catch {
      toast.error(t("toastAddressUpdateError"));
    } finally {
      setIsSavingPosition(false);
    }
  }

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

  function handleEditShape(shape: Shape) {
    setEditingShape(shape);
    setEditLabelInput(shape.label ?? "");
    setEditHeightInput(shape.heightM ?? "");
    setEditRadiusInput(shape.radiusM ?? String(DEFAULT_TREE_RADIUS_M));
  }

  async function confirmEditShape() {
    if (!editingShape) return;
    setIsSavingEdit(true);
    try {
      await updateShape(editingShape.id, {
        label: editLabelInput,
        heightM:
          editingShape.type === "house" || editingShape.type === "tree"
            ? Number(editHeightInput) || null
            : undefined,
        radiusM:
          editingShape.type === "tree"
            ? Number(editRadiusInput) || DEFAULT_TREE_RADIUS_M
            : undefined,
      });
      toast.success(t("toastShapeUpdated"));
      setEditingShape(null);
      router.refresh();
    } catch {
      toast.error(t("sunComputeError"));
    } finally {
      setIsSavingEdit(false);
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
    <div className="garden-map-layout grid gap-4">
      {/*
        Plain inline <style>, not Tailwind's arbitrary-value classes
        (h-[60vh], lg:h-[75vh], lg:grid-cols-[1fr_20rem]): those reliably
        failed to take effect in the Vercel production build (confirmed via
        devtools — manually setting height/grid-template-columns in the
        inspector fixed it instantly) while working locally, even from a
        clean production build — a Tailwind/minifier discrepancy specific
        to Vercel's build toolchain we couldn't pin down further. A literal
        <style> tag sidesteps Tailwind's CSS generation entirely, so it
        can't be affected by whatever that discrepancy is.
      */}
      <style>{`
        .garden-map-layout { grid-template-columns: 1fr; }
        .garden-map-container { height: 60vh; }
        @media (min-width: 1024px) {
          .garden-map-layout { grid-template-columns: 1fr 20rem; }
          .garden-map-container { height: 75vh; }
        }
      `}</style>
      <MapErrorBoundary>
        <div className="garden-map-container relative isolate overflow-hidden rounded-lg border">
          <MapContainer
            center={[Number(garden.lat), Number(garden.lng)]}
            zoom={20}
            maxZoom={22}
            className="h-full w-full"
          >
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name={t("layerSatellite")}>
                <TileLayer
                  attribution="Tiles &copy; Esri"
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  maxZoom={22}
                  maxNativeZoom={18}
                />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name={t("layerStreet")}>
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                  maxZoom={22}
                  maxNativeZoom={18}
                />
              </LayersControl.BaseLayer>
            </LayersControl>
            <MapEvents
              onReady={(map) => (mapRef.current = map)}
              onCreate={handleCreate}
            />

            <Marker
              position={markerPosition}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const { lat, lng } = (e.target as L.Marker).getLatLng();
                  setMarkerPosition([lat, lng]);
                },
              }}
            />

            {shapes
              .filter((shape) => !hiddenShapeIds.has(shape.id))
              .map((shape) => (
                <EditableShapeLayer
                  key={shape.id}
                  shape={shape}
                  editMode={editPositionsMode}
                  opacity={getOpacity(shape)}
                  resetKey={resetKey}
                  onGeometryChange={handleGeometryChange}
                />
              ))}

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
        {positionMoved && (
          <Card>
            <CardContent className="space-y-2 pt-4">
              <p className="text-xs text-muted-foreground">
                {t("positionMovedHint")}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setMarkerPosition(savedPosition)}
                  disabled={isSavingPosition}
                >
                  {t("cancel")}
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleSavePosition}
                  disabled={isSavingPosition}
                >
                  {isSavingPosition && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {t("savePosition")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("shapesTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={editPositionsMode}
                onClick={() => startDraw("boundary")}
              >
                <Square className="h-4 w-4" />
                {t("drawBoundary")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={editPositionsMode}
                onClick={() => startDraw("house")}
              >
                <Home className="h-4 w-4" />
                {t("drawHouse")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={editPositionsMode}
                onClick={() => startDraw("tree")}
              >
                <TreePine className="h-4 w-4" />
                {t("drawTree")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={editPositionsMode}
                onClick={() => startDraw("vegetable_plot")}
              >
                <Sprout className="h-4 w-4" />
                {t("drawPlot")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="col-span-2"
                disabled={editPositionsMode}
                onClick={() => startDraw("green_patch")}
              >
                <Sprout className="h-4 w-4" />
                {t("drawPatch")}
              </Button>
              <Button
                variant={editPositionsMode ? "default" : "outline"}
                size="sm"
                className="col-span-2"
                onClick={() =>
                  editPositionsMode
                    ? handleCancelShapePositions()
                    : setEditPositionsMode(true)
                }
              >
                <Move className="h-4 w-4" />
                {editPositionsMode ? t("stopEditingPositions") : t("editPositions")}
              </Button>
            </div>

            {editPositionsMode && (
              <div className="space-y-2 border-t pt-2">
                <p className="text-xs text-muted-foreground">
                  {t("editPositionsHint")}
                </p>
                {Object.keys(shapeOverrides).length > 0 && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={handleCancelShapePositions}
                      disabled={isSavingShapes}
                    >
                      {t("cancel")}
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={handleSaveShapePositions}
                      disabled={isSavingShapes}
                    >
                      {isSavingShapes && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      {t("savePositions")}
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="border-t pt-2">
              {shapes.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t("noShapes")}</p>
              ) : (
                <ul className="space-y-2">
                  {shapes.map((shape) => {
                    const hidden = hiddenShapeIds.has(shape.id);
                    return (
                      <li key={shape.id} className="space-y-1 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <span
                              className="size-2.5 rounded-full"
                              style={{ backgroundColor: SHAPE_COLORS[shape.type] }}
                            />
                            <span className={hidden ? "text-muted-foreground" : ""}>
                              {shape.label || shapeLabels[shape.type]}
                            </span>
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={
                                hidden ? t("showShapeAriaLabel") : t("hideShapeAriaLabel")
                              }
                              onClick={() => toggleVisibility(shape.id)}
                            >
                              {hidden ? (
                                <EyeOff className="h-3.5 w-3.5" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={t("editShapeAriaLabel")}
                              onClick={() => handleEditShape(shape)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={t("deleteShapeAriaLabel")}
                              onClick={() => handleDeleteShape(shape.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </span>
                        </div>
                        {!hidden && (
                          <div className="flex items-center gap-2 ps-4">
                            <span className="text-xs text-muted-foreground">
                              {t("opacity")}
                            </span>
                            <Slider
                              value={[Math.round(getOpacity(shape) * 100)]}
                              min={0}
                              max={100}
                              step={5}
                              onValueChange={(value) => {
                                const percent = Array.isArray(value) ? value[0] : value;
                                setShapeOpacity((prev) => ({
                                  ...prev,
                                  [shape.id]: percent / 100,
                                }));
                              }}
                              className="flex-1"
                            />
                          </div>
                        )}
                      </li>
                    );
                  })}
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

      <Dialog
        open={editingShape !== null}
        onOpenChange={(next) => !next && setEditingShape(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editingShape &&
                t("editShapeTitle", { type: shapeLabels[editingShape.type] })}
            </DialogTitle>
            <DialogDescription />
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-shape-label">{t("label")}</Label>
              <Input
                id="edit-shape-label"
                placeholder={t("labelPlaceholder")}
                value={editLabelInput}
                onChange={(e) => setEditLabelInput(e.target.value)}
              />
            </div>
            {(editingShape?.type === "house" ||
              editingShape?.type === "tree") && (
              <div className="grid gap-2">
                <Label htmlFor="edit-shape-height">{t("heightM")}</Label>
                <Input
                  id="edit-shape-height"
                  type="number"
                  step="0.1"
                  value={editHeightInput}
                  onChange={(e) => setEditHeightInput(e.target.value)}
                />
              </div>
            )}
            {editingShape?.type === "tree" && (
              <div className="grid gap-2">
                <Label htmlFor="edit-shape-radius">{t("radiusM")}</Label>
                <Input
                  id="edit-shape-radius"
                  type="number"
                  step="0.1"
                  value={editRadiusInput}
                  onChange={(e) => setEditRadiusInput(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingShape(null)}
              disabled={isSavingEdit}
            >
              {t("cancel")}
            </Button>
            <Button onClick={confirmEditShape} disabled={isSavingEdit}>
              {isSavingEdit && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
