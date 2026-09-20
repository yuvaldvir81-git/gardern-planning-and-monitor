import Link from "next/link";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { starterStatusColors } from "@/lib/validations";
import { formatGerminationRange, type SeedMetadataSummary } from "@/lib/seed-metadata";
import { daysSince } from "@/lib/date";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { plantStarters } from "@/db/schema";

type Starter = Pick<
  typeof plantStarters.$inferSelect,
  "id" | "rowIndex" | "colIndex" | "name" | "status" | "datePlanted"
>;

function MetadataTooltipContent({
  name,
  age,
  metadata,
}: {
  name: string;
  age: number;
  metadata: SeedMetadataSummary;
}) {
  const germination = formatGerminationRange(metadata);
  return (
    <div className="space-y-0.5">
      <p className="font-medium">{name}</p>
      <p>Planted {age}d ago</p>
      {germination && <p>Germinate: {germination}</p>}
      {metadata.daysToMaturity && <p>Maturity: {metadata.daysToMaturity}d</p>}
      {metadata.sunRequirement && <p>Sun: {metadata.sunRequirement}</p>}
      {metadata.spacingCm && <p>Spacing: {metadata.spacingCm} cm</p>}
    </div>
  );
}

export function TrayGrid({
  rows,
  cols,
  starters,
  size = "md",
  linkify = true,
  onEmptyCellClick,
  metadataByName = {},
}: {
  rows: number;
  cols: number;
  starters: Starter[];
  size?: "sm" | "md";
  /** Set false when the grid is nested inside another link (e.g. a tray card) to avoid nested <a> tags. */
  linkify?: boolean;
  /** When set, empty cells become clickable to add a starter at that position. */
  onEmptyCellClick?: (rowIndex: number, colIndex: number) => void;
  /** Seed metadata keyed by starter name — filled cells with a matching entry show it in a hover tooltip. */
  metadataByName?: Record<string, SeedMetadataSummary>;
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

          const metadata = metadataByName[starter.name];
          const age = daysSince(starter.datePlanted);
          const cellClassName = cn(
            cellSize,
            "relative flex items-center justify-center overflow-hidden rounded-md px-1 text-center text-xs leading-tight font-medium",
            starterStatusColors[starter.status],
            linkify && "transition-opacity hover:opacity-80"
          );
          const content = (
            <>
              <span className="line-clamp-2 break-words">{starter.name}</span>
              <span className="absolute bottom-0.5 left-0.5 text-[9px] leading-none opacity-70">
                {age}d
              </span>
              {metadata && (
                <span className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-current opacity-60" />
              )}
            </>
          );

          const key = `${r}:${c}`;
          const cellTitle = metadata ? undefined : starter.name;

          if (!metadata) {
            return linkify ? (
              <Link key={key} href={`/starters/${starter.id}`} title={cellTitle} className={cellClassName}>
                {content}
              </Link>
            ) : (
              <div key={key} title={cellTitle} className={cellClassName}>
                {content}
              </div>
            );
          }

          const cellNode = linkify ? (
            <Link href={`/starters/${starter.id}`} className={cellClassName}>
              {content}
            </Link>
          ) : (
            <div className={cellClassName}>{content}</div>
          );

          return (
            <Tooltip key={key}>
              <TooltipTrigger render={cellNode} />
              <TooltipContent>
                <MetadataTooltipContent name={starter.name} age={age} metadata={metadata} />
              </TooltipContent>
            </Tooltip>
          );
        })
      )}
    </div>
  );
}
