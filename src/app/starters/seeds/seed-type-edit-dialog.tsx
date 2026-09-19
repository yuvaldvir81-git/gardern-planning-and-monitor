"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
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
      daysToMaturity: seedType.daysToMaturity?.toString() ?? "",
      sunRequirement: seedType.sunRequirement ?? "",
      spacingCm: seedType.spacingCm ?? "",
      notes: seedType.notes ?? "",
    },
  });

  async function submit(values: SeedTypeMetadataFormValues) {
    try {
      await onSubmit(values);
      toast.success("Seed metadata updated");
      setOpen(false);
    } catch {
      toast.error("Something went wrong. Please try again.");
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
          <DialogDescription>Edit growing metadata for this seed type.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="daysToGerminateMin">Germinate — min days</Label>
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
              <Label htmlFor="daysToGerminateMax">Germinate — max days</Label>
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
              <Label htmlFor="daysToMaturity">Days to maturity</Label>
              <Input id="daysToMaturity" type="number" {...register("daysToMaturity")} />
              {errors.daysToMaturity && (
                <p className="text-sm text-destructive">{errors.daysToMaturity.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="spacingCm">Spacing (cm)</Label>
              <Input id="spacingCm" type="number" step="0.1" {...register("spacingCm")} />
              {errors.spacingCm && (
                <p className="text-sm text-destructive">{errors.spacingCm.message}</p>
              )}
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sunRequirement">Sun requirement</Label>
            <Input id="sunRequirement" placeholder="Full sun" {...register("sunRequirement")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="seed-notes">Notes</Label>
            <Textarea id="seed-notes" rows={3} {...register("notes")} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
