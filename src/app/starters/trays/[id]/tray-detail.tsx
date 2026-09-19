"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
import type { plantStarters, starterTrays } from "@/db/schema";

type Tray = typeof starterTrays.$inferSelect;
type Starter = typeof plantStarters.$inferSelect;

export function TrayDetail({
  tray,
  starters,
  seedNames,
}: {
  tray: Tray;
  starters: Starter[];
  seedNames: string[];
}) {
  const router = useRouter();
  const [isEditingCells, setIsEditingCells] = useState(false);
  const [addPosition, setAddPosition] = useState<{ rowIndex: number; colIndex: number } | null>(
    null
  );

  async function handleDelete() {
    try {
      await deleteTray(tray.id);
      toast.success("Tray deleted");
      router.push("/starters");
    } catch {
      toast.error("Failed to delete tray");
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
              {tray.rows} × {tray.cols} tray — {filledCount} starter{filledCount === 1 ? "" : "s"}
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
                <Button variant="ghost" size="icon" aria-label="Edit tray">
                  <Pencil className="h-4 w-4" />
                </Button>
              }
            />
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button variant="ghost" size="icon" aria-label="Delete tray">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this tray?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes &quot;{tray.name}&quot; and every starter and growth log in it.
                    This can&apos;t be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground">Date planted</p>
            <p>{tray.datePlanted}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Seed source</p>
            <p>{tray.seedSource || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Location</p>
            <p>{tray.location || "—"}</p>
          </div>
          {tray.notes && (
            <div className="col-span-full">
              <p className="text-muted-foreground">Notes</p>
              <p className="whitespace-pre-wrap">{tray.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Grid</CardTitle>
          {!isEditingCells && (
            <Button variant="outline" size="sm" onClick={() => setIsEditingCells(true)}>
              Edit cells
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
                onEmptyCellClick={(rowIndex, colIndex) => setAddPosition({ rowIndex, colIndex })}
              />
              <p className="mt-3 text-xs text-muted-foreground">
                Click a filled cell to open its growth log, or an empty one to add a seed there.
              </p>
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
