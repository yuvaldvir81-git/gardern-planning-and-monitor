import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { getTrayWithStarters } from "../actions";
import { getSeedTypeMetadataMap, getSeedTypeNames } from "../../seed-types/actions";
import { TrayDetail } from "./tray-detail";

export default async function TrayDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [result, seedNames, metadataByName, t] = await Promise.all([
    getTrayWithStarters(id),
    getSeedTypeNames(),
    getSeedTypeMetadataMap(),
    getTranslations("common"),
  ]);
  if (!result) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <Link
        href="/starters"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        {t("backToStarters")}
      </Link>
      <TrayDetail
        tray={result.tray}
        starters={result.starters}
        seedNames={seedNames}
        metadataByName={metadataByName}
      />
    </div>
  );
}
