"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
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
import type { plantStarters } from "@/db/schema";
import { createStarter, deleteStarter } from "./actions";
import { StarterFormDialog } from "./starter-form-dialog";

type Starter = typeof plantStarters.$inferSelect;

export function StartersTable({ starters }: { starters: Starter[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleDelete(id: string) {
    try {
      await deleteStarter(id);
      toast.success("Starter deleted");
      startTransition(() => router.refresh());
    } catch {
      toast.error("Failed to delete starter");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Plant starters</h1>
        <div className="flex gap-2">
          <Button variant="outline" render={<Link href="/starters/import" />}>
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <StarterFormDialog
            onSubmit={async (values) => {
              await createStarter(values);
              router.refresh();
            }}
            trigger={
              <Button>
                <Plus className="h-4 w-4" />
                Add starter
              </Button>
            }
          />
        </div>
      </div>

      {starters.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center">
          <p className="text-muted-foreground">No plant starters yet.</p>
          <p className="text-sm text-muted-foreground">
            Add your first seed or starter to begin tracking its growth.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Species / Variety</TableHead>
                <TableHead>Date planted</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {starters.map((starter) => (
                <TableRow key={starter.id} className="cursor-pointer">
                  <TableCell className="font-medium">
                    <Link href={`/starters/${starter.id}`} className="hover:underline">
                      {starter.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {[starter.species, starter.variety].filter(Boolean).join(" — ") || "—"}
                  </TableCell>
                  <TableCell>{starter.datePlanted}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {starter.location || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{starterStatusLabels[starter.status]}</Badge>
                  </TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Delete starter"
                            disabled={isPending}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this starter?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This removes &quot;{starter.name}&quot; and its entire growth log.
                            This can&apos;t be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(starter.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
