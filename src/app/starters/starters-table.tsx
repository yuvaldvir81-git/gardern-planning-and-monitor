"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Grid3x3, Plus, Trash2, Upload } from "lucide-react";
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
import type { plantStarters } from "@/db/schema";
import { createStarter, deleteStarter } from "./actions";
import { StarterFormDialog } from "./starter-form-dialog";

type Starter = typeof plantStarters.$inferSelect;

export function StartersTable({ starters }: { starters: Starter[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("starters");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("status");

  async function handleDelete(id: string) {
    try {
      await deleteStarter(id);
      toast.success(t("toastDeleted"));
      startTransition(() => router.refresh());
    } catch {
      toast.error(t("toastDeleteFailed"));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link href="/starters/trays/new" />}>
            <Grid3x3 className="h-4 w-4" />
            {t("newTray")}
          </Button>
          <Button variant="outline" render={<Link href="/starters/import" />}>
            <Upload className="h-4 w-4" />
            {t("import")}
          </Button>
          <StarterFormDialog
            onSubmit={async (values) => {
              await createStarter(values);
              router.refresh();
            }}
            trigger={
              <Button>
                <Plus className="h-4 w-4" />
                {t("addStarter")}
              </Button>
            }
          />
        </div>
      </div>

      {starters.length === 0 ? (
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
                <TableHead>{t("colSpeciesVariety")}</TableHead>
                <TableHead>{t("colDatePlanted")}</TableHead>
                <TableHead>{t("colLocation")}</TableHead>
                <TableHead>{t("colStatus")}</TableHead>
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
                    <Badge variant="secondary">{tStatus(starter.status)}</Badge>
                  </TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t("deleteAriaLabel")}
                            disabled={isPending}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("deleteDescription", { name: starter.name })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(starter.id)}>
                            {tCommon("delete")}
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
