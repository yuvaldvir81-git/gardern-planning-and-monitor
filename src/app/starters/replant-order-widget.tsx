"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { RefreshCw, Loader2, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getReplantSchedule, type ReplantScheduleEntry } from "./replant-schedule-actions";

function ReadyBadge({
  daysUntilReadyMin,
  daysUntilReadyMax,
}: {
  daysUntilReadyMin: number | null;
  daysUntilReadyMax: number | null;
}) {
  const t = useTranslations("replantWidget");

  if (daysUntilReadyMin === null) {
    return <span className="text-xs text-muted-foreground">{t("noData")}</span>;
  }
  if (daysUntilReadyMin < 0) {
    return (
      <span className="text-xs font-medium text-destructive">
        {t("overdue", { days: Math.abs(daysUntilReadyMin) })}
      </span>
    );
  }
  if (daysUntilReadyMin === 0) {
    return <span className="text-xs font-medium text-primary">{t("readyToday")}</span>;
  }
  const label =
    daysUntilReadyMax != null && daysUntilReadyMax !== daysUntilReadyMin
      ? t("readyInRange", { min: daysUntilReadyMin, max: daysUntilReadyMax })
      : t("readyIn", { days: daysUntilReadyMin });
  return <span className="text-xs text-muted-foreground">{label}</span>;
}

export function ReplantOrderWidget({
  initialEntries,
}: {
  initialEntries: ReplantScheduleEntry[];
}) {
  const t = useTranslations("replantWidget");
  const [entries, setEntries] = useState(initialEntries);
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function handleRecalculate() {
    setIsRefreshing(true);
    try {
      setEntries(await getReplantSchedule());
    } finally {
      setIsRefreshing(false);
    }
  }

  if (entries.length === 0) return null;

  return (
    <Card className="mb-8">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("recalculateAriaLabel")}
          onClick={handleRecalculate}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {entries.map((entry) => (
            <li
              key={entry.starterId}
              className="flex items-center justify-between gap-3 py-2 text-sm"
            >
              <Link
                href={entry.trayId ? `/starters/trays/${entry.trayId}` : `/starters/${entry.starterId}`}
                className="flex min-w-0 items-center gap-1.5 hover:underline"
              >
                <Sprout className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{entry.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {entry.trayName
                    ? t("trayPosition", {
                        tray: entry.trayName,
                        row: (entry.rowIndex ?? 0) + 1,
                        col: (entry.colIndex ?? 0) + 1,
                      })
                    : t("standalone")}
                </span>
              </Link>
              <ReadyBadge
                daysUntilReadyMin={entry.daysUntilReadyMin}
                daysUntilReadyMax={entry.daysUntilReadyMax}
              />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
