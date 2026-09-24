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
import { seedTypeMetadataFormSchema, type SeedTypeMetadataFormValues } from "@/lib/validations";
import type { seedTypes } from "@/db/schema";

type SeedType = typeof seedTypes.$inferSelect;

export function SeedTypeEditDialog({
  seedType,
  trigger,
  onSubmit,
}: {
  seedType: SeedType;
  trigger: React.ReactElement;
  onSubmit: (values: SeedTypeMetadataFormValues) => Promise<void>;
}) {
  const t = useTranslations("seedTypeEdit");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SeedTypeMetadataFormValues>({
    resolver: zodResolver(seedTypeMetadataFormSchema),
    defaultValues: {
      daysToGerminateMin: seedType.daysToGerminateMin?.toString() ?? "",
      daysToGerminateMax: seedType.daysToGerminateMax?.toString() ?? "",
      daysToTransplantMin: seedType.daysToTransplantMin?.toString() ?? "",
      daysToTransplantMax: seedType.daysToTransplantMax?.toString() ?? "",
      daysToMaturity: seedType.daysToMaturity?.toString() ?? "",
      sunRequirement: seedType.sunRequirement ?? "",
      spacingCm: seedType.spacingCm ?? "",
      notes: seedType.notes ?? "",
    },
  });

  async function submit(values: SeedTypeMetadataFormValues) {
    try {
      await onSubmit(values);
      toast.success(t("toastUpdated"));
      setOpen(false);
    } catch {
      toast.error(tCommon("genericError"));
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{seedType.name}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="daysToGerminateMin">{t("germinateMin")}</Label>
              <Input
                id="daysToGerminateMin"
                type="number"
                {...register("daysToGerminateMin")}
              />
              {errors.daysToGerminateMin && (
                <p className="text-sm text-destructive">{errors.daysToGerminateMin.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="daysToGerminateMax">{t("germinateMax")}</Label>
              <Input
                id="daysToGerminateMax"
                type="number"
                {...register("daysToGerminateMax")}
              />
              {errors.daysToGerminateMax && (
                <p className="text-sm text-destructive">{errors.daysToGerminateMax.message}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="daysToTransplantMin">{t("transplantMin")}</Label>
              <Input
                id="daysToTransplantMin"
                type="number"
                {...register("daysToTransplantMin")}
              />
              {errors.daysToTransplantMin && (
                <p className="text-sm text-destructive">{errors.daysToTransplantMin.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="daysToTransplantMax">{t("transplantMax")}</Label>
              <Input
                id="daysToTransplantMax"
                type="number"
                {...register("daysToTransplantMax")}
              />
              {errors.daysToTransplantMax && (
                <p className="text-sm text-destructive">{errors.daysToTransplantMax.message}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="daysToMaturity">{t("daysToMaturity")}</Label>
              <Input id="daysToMaturity" type="number" {...register("daysToMaturity")} />
              {errors.daysToMaturity && (
                <p className="text-sm text-destructive">{errors.daysToMaturity.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="spacingCm">{t("spacingCm")}</Label>
              <Input id="spacingCm" type="number" step="0.1" {...register("spacingCm")} />
              {errors.spacingCm && (
                <p className="text-sm text-destructive">{errors.spacingCm.message}</p>
              )}
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sunRequirement">{t("sunRequirement")}</Label>
            <Input
              id="sunRequirement"
              placeholder={t("sunRequirementPlaceholder")}
              {...register("sunRequirement")}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="seed-notes">{t("notes")}</Label>
            <Textarea id="seed-notes" rows={3} {...register("notes")} />
          </div>
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
