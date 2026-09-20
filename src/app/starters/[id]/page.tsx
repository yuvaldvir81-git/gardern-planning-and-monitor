import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { getStarterWithEntries } from "../actions";
import { getSeedTypeMetadataMap } from "../seed-types/actions";
import { StarterDetail } from "./starter-detail";

export default async function StarterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [result, metadataByName, t] = await Promise.all([
    getStarterWithEntries(id),
    getSeedTypeMetadataMap(),
    getTranslations("starterDetail"),
  ]);
  if (!result) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <Link
        href={result.starter.trayId ? `/starters/trays/${result.starter.trayId}` : "/starters"}
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        {result.starter.trayId ? t("backToTray") : t("backToStarters")}
      </Link>
      <StarterDetail
        starter={result.starter}
        entries={result.entries}
        seedMetadata={metadataByName[result.starter.name]}
      />
    </div>
  );
}
