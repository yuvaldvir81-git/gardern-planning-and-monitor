"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Loader2, Pencil, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  generateAllMissingSeedMetadata,
  generateSeedMetadata,
  updateSeedTypeMetadata,
} from "../seed-types/actions";
import { SeedTypeEditDialog } from "./seed-type-edit-dialog";
import { formatGerminationRange } from "@/lib/seed-metadata";
import type { seedTypes } from "@/db/schema";

type SeedType = typeof seedTypes.$inferSelect;

export function SeedBankTable({ seedTypes }: { seedTypes: SeedType[] }) {
  const t = useTranslations("seedBank");
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  const missingCount = seedTypes.filter((s) => !s.metadataGeneratedAt).length;

  async function handleGenerate(id: string) {
    setGeneratingId(id);
    try {
      await generateSeedMetadata(id);
      toast.success(t("toastGenerated"));
      startTransition(() => router.refresh());
    } catch {
      toast.error(t("toastGenerateFailed"));
    } finally {
      setGeneratingId(null);
    }
  }

  async function handleGenerateAll() {
    setIsGeneratingAll(true);
    try {
      const { succeeded, failed } = await generateAllMissingSeedMetadata();
      toast.success(
        failed > 0
          ? t("toastGeneratedAllPartial", { succeeded, failed })
          : t("toastGeneratedAll", { count: succeeded })
      );
      startTransition(() => router.refresh());
    } catch {
      toast.error(t("toastGenerateAllFailed"));
    } finally {
      setIsGeneratingAll(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        {missingCount > 0 && (
          <Button onClick={handleGenerateAll} disabled={isGeneratingAll}>
            {isGeneratingAll ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {t("generateMissing", { count: missingCount })}
          </Button>
        )}
      </div>

      {seedTypes.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center">
          <p className="text-muted-foreground">{t("emptyTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("emptyDescription")}</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colName")}</TableHead>
                <TableHead>{t("colGerminate")}</TableHead>
                <TableHead>{t("colMaturity")}</TableHead>
                <TableHead>{t("colSun")}</TableHead>
                <TableHead>{t("colSpacing")}</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {seedTypes.map((seedType) => (
                <TableRow key={seedType.id}>
                  <TableCell className="font-medium">{seedType.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatGerminationRange(seedType) ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {seedType.daysToMaturity ? `${seedType.daysToMaturity}d` : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {seedType.sunRequirement || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {seedType.spacingCm ? `${seedType.spacingCm} cm` : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {!seedType.metadataGeneratedAt && (
                        <Badge variant="secondary">{t("notGenerated")}</Badge>
                      )}
                      <SeedTypeEditDialog
                        seedType={seedType}
                        onSubmit={async (values) => {
                          await updateSeedTypeMetadata(seedType.id, values);
                          router.refresh();
                        }}
                        trigger={
                          <Button variant="ghost" size="icon" aria-label={t("editAriaLabel")}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={
                          seedType.metadataGeneratedAt
                            ? t("regenerateAriaLabel")
                            : t("generateAriaLabel")
                        }
                        disabled={generatingId === seedType.id}
                        onClick={() => handleGenerate(seedType.id)}
                      >
                        {generatingId === seedType.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
