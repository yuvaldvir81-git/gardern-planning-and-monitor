"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { TrayGrid } from "../../tray-grid";
import { deleteTray, updateTray } from "../actions";
import { TrayEditDialog } from "./tray-edit-dialog";
import { EditableTrayGrid } from "./editable-tray-grid";
import { AddCellDialog } from "./add-cell-dialog";
import type { SeedMetadataSummary } from "@/lib/seed-metadata";
import type { plantStarters, starterTrays } from "@/db/schema";

type Tray = typeof starterTrays.$inferSelect;
type Starter = typeof plantStarters.$inferSelect;

export function TrayDetail({
  tray,
  starters,
  seedNames,
  metadataByName,
}: {
  tray: Tray;
  starters: Starter[];
  seedNames: string[];
  metadataByName: Record<string, SeedMetadataSummary>;
}) {
  const router = useRouter();
  const t = useTranslations("trayDetail");
  const tCommon = useTranslations("common");
  const [isEditingCells, setIsEditingCells] = useState(false);
  const [addPosition, setAddPosition] = useState<{ rowIndex: number; colIndex: number } | null>(
    null
  );

  async function handleDelete() {
    try {
      await deleteTray(tray.id);
      toast.success(t("toastDeleted"));
      router.push("/starters");
    } catch {
      toast.error(t("toastDeleteFailed"));
    }
  }

  const filledCount = starters.length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-xl">{tray.name}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("summary", { rows: tray.rows, cols: tray.cols, count: filledCount })}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <TrayEditDialog
              tray={tray}
              onSubmit={async (values) => {
                await updateTray(tray.id, values);
                router.refresh();
              }}
              trigger={
                <Button variant="ghost" size="icon" aria-label={t("editAriaLabel")}>
                  <Pencil className="h-4 w-4" />
                </Button>
              }
            />
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button variant="ghost" size="icon" aria-label={t("deleteAriaLabel")}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("deleteDescription", { name: tray.name })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>{tCommon("delete")}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground">{t("datePlanted")}</p>
            <p>{tray.datePlanted}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("seedSource")}</p>
            <p>{tray.seedSource || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("location")}</p>
            <p>{tray.location || "—"}</p>
          </div>
          {tray.notes && (
            <div className="col-span-full">
              <p className="text-muted-foreground">{t("notes")}</p>
              <p className="whitespace-pre-wrap">{tray.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">{t("grid")}</CardTitle>
          {!isEditingCells && (
            <Button variant="outline" size="sm" onClick={() => setIsEditingCells(true)}>
              {t("editCells")}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isEditingCells ? (
            <EditableTrayGrid
              trayId={tray.id}
              rows={tray.rows}
              cols={tray.cols}
              starters={starters}
              seedNames={seedNames}
              onDone={() => {
                setIsEditingCells(false);
                router.refresh();
              }}
            />
          ) : (
            <>
              <TrayGrid
                rows={tray.rows}
                cols={tray.cols}
                starters={starters}
                metadataByName={metadataByName}
                onEmptyCellClick={(rowIndex, colIndex) => setAddPosition({ rowIndex, colIndex })}
              />
              <p className="mt-3 text-xs text-muted-foreground">{t("gridHint")}</p>
            </>
          )}
        </CardContent>
      </Card>

      <AddCellDialog
        trayId={tray.id}
        position={addPosition}
        seedNames={seedNames}
        onOpenChange={(open) => {
          if (!open) setAddPosition(null);
        }}
        onAdded={() => {
          setAddPosition(null);
          router.refresh();
        }}
      />
    </div>
  );
}
