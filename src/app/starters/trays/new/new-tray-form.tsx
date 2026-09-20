"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trayFormSchema, type TrayFormValues } from "@/lib/validations";
import { SeedNameCombobox } from "../../seed-name-combobox";
import { getSeedTypeNames } from "../../seed-types/actions";
import { createTrayFromGrid } from "../actions";

const MIN_SIZE = 1;
const MAX_SIZE = 20;

function resizeGrid(grid: string[][], rows: number, cols: number): string[][] {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => grid[r]?.[c] ?? "")
  );
}

export function NewTrayForm() {
  const t = useTranslations("newTray");
  const router = useRouter();
  const [rows, setRows] = useState(4);
  const [cols, setCols] = useState(6);
  const [grid, setGrid] = useState<string[][]>(() => resizeGrid([], 4, 6));
  const [seedNames, setSeedNames] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    getSeedTypeNames().then(setSeedNames);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TrayFormValues>({
    resolver: zodResolver(trayFormSchema),
    defaultValues: {
      name: "",
      datePlanted: new Date().toISOString().slice(0, 10),
      location: "",
      seedSource: "",
      notes: "",
    },
  });

  function updateSize(nextRows: number, nextCols: number) {
    const clampedRows = Math.min(MAX_SIZE, Math.max(MIN_SIZE, nextRows));
    const clampedCols = Math.min(MAX_SIZE, Math.max(MIN_SIZE, nextCols));
    setRows(clampedRows);
    setCols(clampedCols);
    setGrid((prev) => resizeGrid(prev, clampedRows, clampedCols));
  }

  function setCell(r: number, c: number, value: string) {
    setGrid((prev) => {
      const next = prev.map((row) => [...row]);
      next[r][c] = value;
      return next;
    });
  }

  const filledCount = grid.reduce((sum, row) => sum + row.filter((c) => c.trim()).length, 0);

  async function onSubmit(values: TrayFormValues) {
    setIsCreating(true);
    try {
      const { trayId, imported } = await createTrayFromGrid(values, grid);
      toast.success(t("toastCreated", { count: imported }));
      router.push(`/starters/trays/${trayId}`);
    } catch {
      toast.error(t("toastError"));
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">{t("name")}</Label>
            <Input id="name" placeholder={t("namePlaceholder")} {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="datePlanted">{t("datePlanted")}</Label>
              <Input id="datePlanted" type="date" {...register("datePlanted")} />
              {errors.datePlanted && (
                <p className="text-sm text-destructive">{errors.datePlanted.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">{t("location")}</Label>
              <Input id="location" placeholder={t("locationPlaceholder")} {...register("location")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="seedSource">{t("seedSource")}</Label>
              <Input id="seedSource" placeholder={t("seedSourcePlaceholder")} {...register("seedSource")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">{t("notes")}</Label>
              <Input id="notes" placeholder={t("notesPlaceholder")} {...register("notes")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="rows">{t("rows")}</Label>
              <Input
                id="rows"
                type="number"
                min={MIN_SIZE}
                max={MAX_SIZE}
                value={rows}
                onChange={(e) => updateSize(Number(e.target.value) || MIN_SIZE, cols)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cols">{t("columns")}</Label>
              <Input
                id="cols"
                type="number"
                min={MIN_SIZE}
                max={MAX_SIZE}
                value={cols}
                onChange={(e) => updateSize(rows, Number(e.target.value) || MIN_SIZE)}
              />
            </div>
          </div>

          <div>
            <Label>{t("cellsFilled", { count: filledCount })}</Label>
            <div
              className="mt-2 grid gap-1.5"
              style={{ gridTemplateColumns: `repeat(${cols}, minmax(7rem, 1fr))` }}
            >
              {grid.map((row, r) =>
                row.map((cellValue, c) => (
                  <SeedNameCombobox
                    key={`${r}:${c}`}
                    value={cellValue}
                    onChange={(v) => setCell(r, c, v)}
                    suggestions={seedNames}
                    placeholder={`${r + 1},${c + 1}`}
                  />
                ))
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isCreating || filledCount === 0}>
              {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("createButton", { count: filledCount })}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
