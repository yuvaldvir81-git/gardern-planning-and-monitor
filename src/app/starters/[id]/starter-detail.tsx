"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatGerminationRange, type SeedMetadataSummary } from "@/lib/seed-metadata";
import type { growthEntries, plantStarters } from "@/db/schema";
import { addGrowthEntry, deleteGrowthEntry, updateStarter } from "../actions";
import { StarterFormDialog } from "../starter-form-dialog";
import { GrowthEntryDialog } from "./growth-entry-dialog";

type Starter = typeof plantStarters.$inferSelect;
type GrowthEntry = typeof growthEntries.$inferSelect;

export function StarterDetail({
  starter,
  entries,
  seedMetadata,
}: {
  starter: Starter;
  entries: GrowthEntry[];
  seedMetadata?: SeedMetadataSummary;
}) {
  const router = useRouter();
  const t = useTranslations("starterDetail");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("status");

  async function handleDeleteEntry(entryId: string) {
    try {
      await deleteGrowthEntry(entryId, starter.id);
      toast.success(t("toastEntryDeleted"));
      router.refresh();
    } catch {
      toast.error(t("toastEntryDeleteFailed"));
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-xl">{starter.name}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {[starter.species, starter.variety].filter(Boolean).join(" — ") || t("noSpecies")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{tStatus(starter.status)}</Badge>
            <StarterFormDialog
              starter={starter}
              onSubmit={async (values) => {
                await updateStarter(starter.id, values);
                router.refresh();
              }}
              trigger={
                <Button variant="outline" size="sm">
                  {t("edit")}
                </Button>
              }
            />
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          {starter.photoUrl && (
            <div className="col-span-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={starter.photoUrl}
                alt={t("photoAlt", { name: starter.name })}
                className="h-32 w-32 rounded-md border object-cover"
              />
            </div>
          )}
          <div>
            <p className="text-muted-foreground">{t("datePlanted")}</p>
            <p>{starter.datePlanted}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("seedSource")}</p>
            <p>{starter.seedSource || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("location")}</p>
            <p>{starter.location || "—"}</p>
          </div>
          {starter.notes && (
            <div className="col-span-full">
              <p className="text-muted-foreground">{t("notes")}</p>
              <p className="whitespace-pre-wrap">{starter.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {seedMetadata && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("seedInfo")}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <p className="text-muted-foreground">{t("germinate")}</p>
              <p>{formatGerminationRange(seedMetadata) ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("maturity")}</p>
              <p>{seedMetadata.daysToMaturity ? `${seedMetadata.daysToMaturity}d` : "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("sun")}</p>
              <p>{seedMetadata.sunRequirement || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("spacing")}</p>
              <p>{seedMetadata.spacingCm ? `${seedMetadata.spacingCm} cm` : "—"}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">{t("growthLog")}</CardTitle>
          <GrowthEntryDialog
            onSubmit={async (values) => {
              await addGrowthEntry(starter.id, values);
              router.refresh();
            }}
          />
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("emptyLog")}</p>
          ) : (
            <ul className="space-y-4">
              {entries.map((entry, i) => (
                <li key={entry.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{entry.entryDate}</span>
                        {entry.stage && <Badge variant="outline">{tStatus(entry.stage)}</Badge>}
                        {entry.heightCm && (
                          <span className="text-sm text-muted-foreground">
                            {entry.heightCm} cm
                          </span>
                        )}
                      </div>
                      {entry.notes && (
                        <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                          {entry.notes}
                        </p>
                      )}
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t("deleteEntryAriaLabel")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t("deleteEntryTitle")}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("deleteEntryDescription", { date: entry.entryDate })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteEntry(entry.id)}>
                            {tCommon("delete")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  {i < entries.length - 1 && <Separator className="mt-4" />}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
