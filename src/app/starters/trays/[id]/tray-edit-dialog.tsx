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
import { trayFormSchema, type TrayFormValues } from "@/lib/validations";
import type { starterTrays } from "@/db/schema";

type Tray = typeof starterTrays.$inferSelect;

export function TrayEditDialog({
  tray,
  trigger,
  onSubmit,
}: {
  tray: Tray;
  trigger: React.ReactElement;
  onSubmit: (values: TrayFormValues) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
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
      await onSubmit(values);
      toast.success("Tray updated");
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
          <DialogTitle>Edit tray</DialogTitle>
          <DialogDescription>Update this tray&apos;s details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="tray-name">Tray name</Label>
            <Input id="tray-name" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="tray-datePlanted">Date planted</Label>
              <Input id="tray-datePlanted" type="date" {...register("datePlanted")} />
              {errors.datePlanted && (
                <p className="text-sm text-destructive">{errors.datePlanted.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tray-location">Location</Label>
              <Input id="tray-location" {...register("location")} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tray-seedSource">Seed source</Label>
            <Input id="tray-seedSource" {...register("seedSource")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tray-notes">Notes</Label>
            <Textarea id="tray-notes" rows={3} {...register("notes")} />
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
