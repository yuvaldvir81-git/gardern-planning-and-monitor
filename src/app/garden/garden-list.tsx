"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Trash2, MapPin } from "lucide-react";
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
import { deleteGarden } from "./actions";
import type { gardens } from "@/db/schema";

type Garden = typeof gardens.$inferSelect;

export function GardenList({ gardens }: { gardens: Garden[] }) {
  const t = useTranslations("garden");
  const tCommon = useTranslations("common");
  const router = useRouter();

  async function handleDelete(id: string) {
    try {
      await deleteGarden(id);
      toast.success(t("toastDeleted"));
      router.refresh();
    } catch {
      // action already validates ownership server-side
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t("listTitle")}</h1>
        <Button render={<Link href="/garden/new" />}>
          <Plus className="h-4 w-4" />
          {t("newGarden")}
        </Button>
      </div>

      {gardens.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center">
          <p className="text-muted-foreground">{t("emptyTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("emptyDescription")}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gardens.map((garden) => (
            <Card key={garden.id} className="relative">
              <Link href={`/garden/${garden.id}`}>
                <CardHeader>
                  <CardTitle className="text-base">{garden.name}</CardTitle>
                  {garden.addressLabel && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="line-clamp-1">{garden.addressLabel}</span>
                    </p>
                  )}
                </CardHeader>
              </Link>
              <CardContent>
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
                        {t("deleteDescription", { name: garden.name })}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(garden.id)}>
                        {tCommon("delete")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
