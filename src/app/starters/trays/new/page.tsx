import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { NewTrayForm } from "./new-tray-form";

export default async function NewTrayPage() {
  const t = await getTranslations("common");

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <Link
        href="/starters"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        {t("backToStarters")}
      </Link>
      <NewTrayForm />
    </div>
  );
}
