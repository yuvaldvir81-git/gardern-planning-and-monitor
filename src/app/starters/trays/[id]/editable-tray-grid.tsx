"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SeedNameCombobox } from "../../seed-name-combobox";
import { updateTrayCells } from "../actions";
import type { plantStarters } from "@/db/schema";

type Starter = Pick<typeof plantStarters.$inferSelect, "rowIndex" | "colIndex" | "name">;

function buildGrid(rows: number, cols: number, starters: Starter[]): string[][] {
  const byPosition = new Map(starters.map((s) => [`${s.rowIndex}:${s.colIndex}`, s.name]));
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
  const [initial] = useState(() => buildGrid(rows, cols, starters));
  const [grid, setGrid] = useState(initial);
  const [isSaving, setIsSaving] = useState(false);

  function setCell(r: number, c: number, value: string) {
    setGrid((prev) => {
      const next = prev.map((row) => [...row]);
      next[r][c] = value;
      return next;
    });
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const changes = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (grid[r][c] !== initial[r][c]) {
            changes.push({ rowIndex: r, colIndex: c, name: grid[r][c] });
          }
        }
      }
      if (changes.length === 0) {
        onDone();
        return;
      }
      const { updated, created } = await updateTrayCells(trayId, changes);
      toast.success(
        [updated ? `updated ${updated}` : "", created ? `added ${created}` : ""]
          .filter(Boolean)
          .join(", ") || "No changes"
      );
      onDone();
    } catch {
      toast.error("Couldn't save changes");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div
        className="grid gap-1.5"
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
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onDone} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save changes
        </Button>
      </div>
    </div>
  );
}
