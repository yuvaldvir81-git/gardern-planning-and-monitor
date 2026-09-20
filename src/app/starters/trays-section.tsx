import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrayGrid } from "./tray-grid";
import type { getTraysForUser } from "./trays/actions";
import type { SeedMetadataSummary } from "@/lib/seed-metadata";

type Trays = Awaited<ReturnType<typeof getTraysForUser>>;

export async function TraysSection({
  trays,
  metadataByName,
}: {
  trays: Trays;
  metadataByName: Record<string, SeedMetadataSummary>;
}) {
  if (trays.length === 0) return null;

  const t = await getTranslations("traysSection");

  return (
    <div className="mb-8 space-y-4">
      <h2 className="text-lg font-semibold tracking-tight">{t("heading")}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {trays.map((tray) => (
          <Link key={tray.id} href={`/starters/trays/${tray.id}`}>
            <Card className="h-full transition-colors hover:border-primary">
              <CardHeader>
                <CardTitle className="text-base">{tray.name}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {t("summary", {
                    rows: tray.rows,
                    cols: tray.cols,
                    count: tray.starters.length,
                  })}
                </p>
              </CardHeader>
              <CardContent>
                <TrayGrid
                  rows={tray.rows}
                  cols={tray.cols}
                  starters={tray.starters}
                  size="sm"
                  linkify={false}
                  metadataByName={metadataByName}
                />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
