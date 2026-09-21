"use client";

import { Fragment, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SeedNameCombobox } from "../../seed-name-combobox";
import { updateTrayCells } from "../actions";
import type { plantStarters } from "@/db/schema";

type Starter = Pick<
  typeof plantStarters.$inferSelect,
  "rowIndex" | "colIndex" | "name" | "datePlanted"
>;

function buildGrid(rows: number, cols: number, starters: Starter[]): string[][] {
  const byPosition = new Map(starters.map((s) => [`${s.rowIndex}:${s.colIndex}`, s.name]));
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => byPosition.get(`${r}:${c}`) ?? "")
  );
}

function buildDateGrid(rows: number, cols: number, starters: Starter[]): string[][] {
  const byPosition = new Map(starters.map((s) => [`${s.rowIndex}:${s.colIndex}`, s.datePlanted]));
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => byPosition.get(`${r}:${c}`) ?? "")
  );
}

export function EditableTrayGrid({
  trayId,
  rows,
  cols,
  starters,
  seedNames,
  onDone,
}: {
  trayId: string;
  rows: number;
  cols: number;
  starters: Starter[];
  seedNames: string[];
  onDone: () => void;
}) {
  const t = useTranslations("editableTrayGrid");
  const tCommon = useTranslations("common");
  const [initial] = useState(() => buildGrid(rows, cols, starters));
  const [grid, setGrid] = useState(initial);
  const [initialDates] = useState(() => buildDateGrid(rows, cols, starters));
  const [dateGrid, setDateGrid] = useState(initialDates);
  const [isSaving, setIsSaving] = useState(false);
  const [rowFill, setRowFill] = useState<string[]>(() => Array(rows).fill(""));
  const [colFill, setColFill] = useState<string[]>(() => Array(cols).fill(""));
  const [rowDateFill, setRowDateFill] = useState<string[]>(() => Array(rows).fill(""));
  const [colDateFill, setColDateFill] = useState<string[]>(() => Array(cols).fill(""));

  function setCell(r: number, c: number, value: string) {
    setGrid((prev) => {
      const next = prev.map((row) => [...row]);
      next[r][c] = value;
      return next;
    });
  }

  function setDateCell(r: number, c: number, value: string) {
    setDateGrid((prev) => {
      const next = prev.map((row) => [...row]);
      next[r][c] = value;
      return next;
    });
  }

  function fillRow(r: number) {
    const value = rowFill[r].trim();
    if (!value) return;
    setGrid((prev) => {
      const next = prev.map((row) => [...row]);
      next[r] = next[r].map(() => value);
      return next;
    });
  }

  function fillColumn(c: number) {
    const value = colFill[c].trim();
    if (!value) return;
    setGrid((prev) => prev.map((row) => row.map((cell, i) => (i === c ? value : cell))));
  }

  function fillRowDate(r: number) {
    const value = rowDateFill[r];
    if (!value) return;
    setDateGrid((prev) => {
      const next = prev.map((row) => [...row]);
      next[r] = next[r].map(() => value);
      return next;
    });
  }

  function fillColumnDate(c: number) {
    const value = colDateFill[c];
    if (!value) return;
    setDateGrid((prev) => prev.map((row) => row.map((cell, i) => (i === c ? value : cell))));
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const changes = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const nameChanged = grid[r][c] !== initial[r][c];
          const dateChanged = dateGrid[r][c] !== initialDates[r][c];
          if (nameChanged || dateChanged) {
            changes.push({
              rowIndex: r,
              colIndex: c,
              name: grid[r][c],
              ...(dateGrid[r][c] ? { datePlanted: dateGrid[r][c] } : {}),
            });
          }
        }
      }
      if (changes.length === 0) {
        onDone();
        return;
      }
      const { updated, created } = await updateTrayCells(trayId, changes);
      toast.success(
        [
          updated ? t("updated", { count: updated }) : "",
          created ? t("added", { count: created }) : "",
        ]
          .filter(Boolean)
          .join(", ") || t("noChanges")
      );
      onDone();
    } catch {
      toast.error(t("saveError"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto pb-1">
        <div
          className="grid gap-1.5"
          style={{
            gridTemplateColumns: `minmax(7rem, auto) repeat(${cols}, minmax(7rem, 1fr))`,
          }}
        >
          <div />
          {colFill.map((value, c) => (
            <div key={`col-fill-${c}`} className="flex flex-col gap-1">
              <div className="flex gap-1">
                <SeedNameCombobox
                  value={value}
                  onChange={(v) =>
                    setColFill((prev) => prev.map((x, i) => (i === c ? v : x)))
                  }
                  suggestions={seedNames}
                  placeholder={t("fillColumnPlaceholder", { col: c + 1 })}
                />
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={t("fillColumnAriaLabel", { col: c + 1 })}
                  onClick={() => fillColumn(c)}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-1">
                <Input
                  type="date"
                  className="text-xs"
                  value={colDateFill[c]}
                  onChange={(e) =>
                    setColDateFill((prev) => prev.map((x, i) => (i === c ? e.target.value : x)))
                  }
                />
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={t("fillColumnDateAriaLabel", { col: c + 1 })}
                  onClick={() => fillColumnDate(c)}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          {grid.map((row, r) => (
            <Fragment key={`row-${r}`}>
              <div className="flex flex-col gap-1">
                <div className="flex gap-1">
                  <SeedNameCombobox
                    value={rowFill[r]}
                    onChange={(v) =>
                      setRowFill((prev) => prev.map((x, i) => (i === r ? v : x)))
                    }
                    suggestions={seedNames}
                    placeholder={t("fillRowPlaceholder", { row: r + 1 })}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={t("fillRowAriaLabel", { row: r + 1 })}
                    onClick={() => fillRow(r)}
                  >
                    <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                  </Button>
                </div>
                <div className="flex gap-1">
                  <Input
                    type="date"
                    className="text-xs"
                    value={rowDateFill[r]}
                    onChange={(e) =>
                      setRowDateFill((prev) => prev.map((x, i) => (i === r ? e.target.value : x)))
                    }
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={t("fillRowDateAriaLabel", { row: r + 1 })}
                    onClick={() => fillRowDate(r)}
                  >
                    <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                  </Button>
                </div>
              </div>
              {row.map((cellValue, c) => (
                <div key={`${r}:${c}`} className="flex flex-col gap-1">
                  <SeedNameCombobox
                    value={cellValue}
                    onChange={(v) => setCell(r, c, v)}
                    suggestions={seedNames}
                    placeholder={`${r + 1},${c + 1}`}
                  />
                  <Input
                    type="date"
                    className="text-xs"
                    value={dateGrid[r][c]}
                    onChange={(e) => setDateCell(r, c, e.target.value)}
                  />
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onDone} disabled={isSaving}>
          {tCommon("cancel")}
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          {tCommon("saveChanges")}
        </Button>
      </div>
    </div>
  );
}
