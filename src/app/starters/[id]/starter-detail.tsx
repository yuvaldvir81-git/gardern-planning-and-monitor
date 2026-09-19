"use client";

import { useRouter } from "next/navigation";
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
import { starterStatusLabels } from "@/lib/validations";
import type { growthEntries, plantStarters } from "@/db/schema";
import { addGrowthEntry, deleteGrowthEntry, updateStarter } from "../actions";
import { StarterFormDialog } from "../starter-form-dialog";
import { GrowthEntryDialog } from "./growth-entry-dialog";

type Starter = typeof plantStarters.$inferSelect;
type GrowthEntry = typeof growthEntries.$inferSelect;

export function StarterDetail({
  starter,
  entries,
}: {
  starter: Starter;
  entries: GrowthEntry[];
}) {
  const router = useRouter();

  async function handleDeleteEntry(entryId: string) {
    try {
      await deleteGrowthEntry(entryId, starter.id);
      toast.success("Entry deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete entry");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-xl">{starter.name}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {[starter.species, starter.variety].filter(Boolean).join(" — ") ||
                "No species set"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{starterStatusLabels[starter.status]}</Badge>
            <StarterFormDialog
              starter={starter}
              onSubmit={async (values) => {
                await updateStarter(starter.id, values);
                router.refresh();
              }}
              trigger={
                <Button variant="outline" size="sm">
                  Edit
                </Button>
              }
            />
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground">Date planted</p>
            <p>{starter.datePlanted}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Seed source</p>
            <p>{starter.seedSource || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Location</p>
            <p>{starter.location || "—"}</p>
          </div>
          {starter.notes && (
            <div className="col-span-full">
              <p className="text-muted-foreground">Notes</p>
              <p className="whitespace-pre-wrap">{starter.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Growth log</CardTitle>
          <GrowthEntryDialog
            onSubmit={async (values) => {
              await addGrowthEntry(starter.id, values);
              router.refresh();
            }}
          />
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No growth entries yet. Add one to start tracking progress.
            </p>
          ) : (
            <ul className="space-y-4">
              {entries.map((entry, i) => (
                <li key={entry.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{entry.entryDate}</span>
                        {entry.stage && (
                          <Badge variant="outline">{starterStatusLabels[entry.stage]}</Badge>
                        )}
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
                          <Button variant="ghost" size="icon" aria-label="Delete entry">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This removes the {entry.entryDate} growth log entry. This can&apos;t
                            be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteEntry(entry.id)}>
                            Delete
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
