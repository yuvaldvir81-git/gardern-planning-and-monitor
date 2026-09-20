import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { getGardensForUser } from "./actions";
import { GardenList } from "./garden-list";

export default async function GardenPage() {
  const [gardenList, t] = await Promise.all([getGardensForUser(), getTranslations("garden")]);

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <Link
        href="/starters"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        {t("backToStarters")}
      </Link>
      <GardenList gardens={gardenList} />
    </div>
  );
}
