import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserLanguage } from "./actions";
import { LanguageSwitcher } from "./language-switcher";

export default async function SettingsPage() {
  const [t, language] = await Promise.all([getTranslations("settings"), getUserLanguage()]);

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <Link
        href="/starters"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        {t("backToStarters")}
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">{t("languageLabel")}</p>
          <LanguageSwitcher current={language} />
        </CardContent>
      </Card>
    </div>
  );
}
