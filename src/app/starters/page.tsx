import Link from "next/link";
import { MapPinned, Settings, Sprout } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { UserButton } from "@clerk/nextjs";
import { getStartersForUser } from "./actions";
import { getTraysForUser } from "./trays/actions";
import { getSeedTypeMetadataMap } from "./seed-types/actions";
import { StartersTable } from "./starters-table";
import { TraysSection } from "./trays-section";

export default async function StartersPage() {
  const [starters, trays, metadataByName, t, tGarden] = await Promise.all([
    getStartersForUser(),
    getTraysForUser(),
    getSeedTypeMetadataMap(),
    getTranslations("nav"),
    getTranslations("garden"),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-muted-foreground">{t("appName")}</span>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/garden"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <MapPinned className="h-4 w-4" />
            {tGarden("navLink")}
          </Link>
          <Link
            href="/starters/seeds"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <Sprout className="h-4 w-4" />
            {t("seedBank")}
          </Link>
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <Settings className="h-4 w-4" />
            {t("settings")}
          </Link>
          <UserButton />
        </div>
      </div>
      <TraysSection trays={trays} metadataByName={metadataByName} />
      <StartersTable starters={starters} />
    </div>
  );
}
