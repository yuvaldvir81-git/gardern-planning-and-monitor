import Link from "next/link";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { starterStatusColors } from "@/lib/validations";
import type { plantStarters } from "@/db/schema";

type Starter = Pick<typeof plantStarters.$inferSelect, "id" | "rowIndex" | "colIndex" | "name" | "status">;

export function TrayGrid({
  rows,
  cols,
  starters,
  size = "md",
  linkify = true,
  onEmptyCellClick,
}: {
  rows: number;
  cols: number;
  starters: Starter[];
  size?: "sm" | "md";
  /** Set false when the grid is nested inside another link (e.g. a tray card) to avoid nested <a> tags. */
  linkify?: boolean;
  /** When set, empty cells become clickable to add a starter at that position. */
  onEmptyCellClick?: (rowIndex: number, colIndex: number) => void;
}) {
  const cellByPosition = new Map(starters.map((s) => [`${s.rowIndex}:${s.colIndex}`, s]));
  const cellSize = size === "sm" ? "h-9" : "h-14";

  return (
    <div
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((_, c) => {
          const starter = cellByPosition.get(`${r}:${c}`);
          if (!starter) {
            if (onEmptyCellClick) {
              return (
                <button
                  key={`${r}:${c}`}
                  type="button"
                  aria-label={`Add a starter at row ${r + 1}, column ${c + 1}`}
                  onClick={() => onEmptyCellClick(r, c)}
                  className={cn(
                    cellSize,
                    "group flex items-center justify-center rounded-md border border-dashed hover:border-primary hover:bg-muted"
                  )}
                >
                  <Plus className="h-3.5 w-3.5 text-transparent group-hover:text-muted-foreground" />
                </button>
              );
            }
            return (
              <div
                key={`${r}:${c}`}
                className={cn(cellSize, "rounded-md border border-dashed")}
              />
            );
          }
          const cellClassName = cn(
            cellSize,
            "flex items-center justify-center overflow-hidden rounded-md px-1 text-center text-xs leading-tight font-medium",
            starterStatusColors[starter.status],
            linkify && "transition-opacity hover:opacity-80"
          );
          const content = (
            <span className="line-clamp-2 break-words">{starter.name}</span>
          );
          if (!linkify) {
            return (
              <div key={`${r}:${c}`} title={starter.name} className={cellClassName}>
                {content}
              </div>
            );
          }
          return (
            <Link
              key={`${r}:${c}`}
              href={`/starters/${starter.id}`}
              title={starter.name}
              className={cellClassName}
            >
              {content}
            </Link>
          );
        })
      )}
    </div>
  );
}
