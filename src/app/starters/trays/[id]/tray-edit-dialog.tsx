"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trayFormSchema, type TrayFormValues } from "@/lib/validations";
import type { starterTrays } from "@/db/schema";

type Tray = typeof starterTrays.$inferSelect;

const MAX_SIZE = 20;

export function TrayEditDialog({
  tray,
  minRows,
  minCols,
  trigger,
  onSubmit,
}: {
  tray: Tray;
  /** Smallest size that wouldn't cut off a starter already placed in the tray. */
  minRows: number;
  minCols: number;
  trigger: React.ReactElement;
  onSubmit: (values: TrayFormValues, size: { rows: number; cols: number }) => Promise<void>;
}) {
  const t = useTranslations("trayEdit");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(tray.rows);
  const [cols, setCols] = useState(tray.cols);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TrayFormValues>({
    resolver: zodResolver(trayFormSchema),
    defaultValues: {
      name: tray.name,
      datePlanted: tray.datePlanted,
      location: tray.location ?? "",
      seedSource: tray.seedSource ?? "",
      notes: tray.notes ?? "",
    },
  });

  async function submit(values: TrayFormValues) {
    try {
      await onSubmit(values, { rows, cols });
      toast.success(t("toastUpdated"));
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tCommon("genericError"));
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          reset();
          setRows(tray.rows);
          setCols(tray.cols);
        }
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="tray-name">{t("name")}</Label>
            <Input id="tray-name" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="tray-datePlanted">{t("datePlanted")}</Label>
              <Input id="tray-datePlanted" type="date" {...register("datePlanted")} />
              {errors.datePlanted && (
                <p className="text-sm text-destructive">{errors.datePlanted.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tray-location">{t("location")}</Label>
              <Input id="tray-location" {...register("location")} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tray-seedSource">{t("seedSource")}</Label>
            <Input id="tray-seedSource" {...register("seedSource")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tray-notes">{t("notes")}</Label>
            <Textarea id="tray-notes" rows={3} {...register("notes")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="tray-rows">{t("rows")}</Label>
              <Input
                id="tray-rows"
                type="number"
                min={minRows}
                max={MAX_SIZE}
                value={rows}
                onChange={(e) =>
                  setRows(Math.min(MAX_SIZE, Math.max(minRows, Number(e.target.value) || minRows)))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tray-cols">{t("columns")}</Label>
              <Input
                id="tray-cols"
                type="number"
                min={minCols}
                max={MAX_SIZE}
                value={cols}
                onChange={(e) =>
                  setCols(Math.min(MAX_SIZE, Math.max(minCols, Number(e.target.value) || minCols)))
                }
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{t("sizeHint")}</p>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {tCommon("saveChanges")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
