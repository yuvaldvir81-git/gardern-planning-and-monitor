import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { getGardenWithShapes } from "../actions";
import { GardenMapLoader } from "./garden-map-loader";

export default async function GardenDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [result, t] = await Promise.all([getGardenWithShapes(id), getTranslations("garden")]);
  if (!result) notFound();

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <Link
        href="/garden"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        {t("backToGardens")}
      </Link>
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">{result.garden.name}</h1>
      <GardenMapLoader garden={result.garden} shapes={result.shapes} />
    </div>
  );
}
