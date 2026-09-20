"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setUserLanguage } from "./actions";
import type { Locale } from "@/i18n/request";

export function LanguageSwitcher({ current }: { current: Locale }) {
  const t = useTranslations("settings");
  const router = useRouter();
  const [pendingLocale, setPendingLocale] = useState<Locale | null>(null);
  const [, startTransition] = useTransition();

  async function handleSelect(locale: Locale) {
    if (locale === current) return;
    setPendingLocale(locale);
    try {
      await setUserLanguage(locale);
      startTransition(() => router.refresh());
    } catch {
      toast.error(t("saveError"));
    } finally {
      setPendingLocale(null);
    }
  }

  const options: { value: Locale; label: string }[] = [
    { value: "en", label: t("english") },
    { value: "he", label: t("hebrew") },
  ];

  return (
    <div className="flex gap-2">
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant={current === option.value ? "default" : "outline"}
          disabled={pendingLocale !== null}
          onClick={() => handleSelect(option.value)}
        >
          {pendingLocale === option.value && <Loader2 className="h-4 w-4 animate-spin" />}
          {option.label}
        </Button>
      ))}
    </div>
  );
}
