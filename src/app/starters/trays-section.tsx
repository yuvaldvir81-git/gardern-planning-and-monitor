import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrayGrid } from "./tray-grid";
import type { getTraysForUser } from "./trays/actions";

type Trays = Awaited<ReturnType<typeof getTraysForUser>>;

export function TraysSection({ trays }: { trays: Trays }) {
  if (trays.length === 0) return null;

  return (
    <div className="mb-8 space-y-4">
      <h2 className="text-lg font-semibold tracking-tight">Trays</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {trays.map((tray) => (
          <Link key={tray.id} href={`/starters/trays/${tray.id}`}>
            <Card className="h-full transition-colors hover:border-primary">
              <CardHeader>
                <CardTitle className="text-base">{tray.name}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {tray.rows} × {tray.cols} — {tray.starters.length} starter
                  {tray.starters.length === 1 ? "" : "s"}
                </p>
              </CardHeader>
              <CardContent>
                <TrayGrid
                  rows={tray.rows}
                  cols={tray.cols}
                  starters={tray.starters}
                  size="sm"
                  linkify={false}
                />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
