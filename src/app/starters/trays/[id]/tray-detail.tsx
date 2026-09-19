"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
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
import { deleteTray } from "../actions";
import type { plantStarters, starterTrays } from "@/db/schema";

type Tray = typeof starterTrays.$inferSelect;
type Starter = typeof plantStarters.$inferSelect;

export function TrayDetail({ tray, starters }: { tray: Tray; starters: Starter[] }) {
  const router = useRouter();

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
        <CardHeader>
          <CardTitle className="text-lg">Grid</CardTitle>
        </CardHeader>
        <CardContent>
          <TrayGrid rows={tray.rows} cols={tray.cols} starters={starters} />
          <p className="mt-3 text-xs text-muted-foreground">
            Click a cell to open that starter&apos;s growth log.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
