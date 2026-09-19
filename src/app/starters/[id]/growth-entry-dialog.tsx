"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  growthEntryFormSchema,
  starterStatusLabels,
  starterStatusValues,
  type GrowthEntryFormValues,
} from "@/lib/validations";

export function GrowthEntryDialog({
  onSubmit,
}: {
  onSubmit: (values: GrowthEntryFormValues) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GrowthEntryFormValues>({
    resolver: zodResolver(growthEntryFormSchema),
    defaultValues: {
      entryDate: new Date().toISOString().slice(0, 10),
      heightCm: "",
      stage: undefined,
      notes: "",
    },
  });

  async function submit(values: GrowthEntryFormValues) {
    try {
      await onSubmit(values);
      toast.success("Growth entry added");
      setOpen(false);
      reset();
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
      <DialogTrigger render={<Button size="sm">Add entry</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a growth entry</DialogTitle>
          <DialogDescription>Log how this starter looks today.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="entryDate">Date</Label>
              <Input id="entryDate" type="date" {...register("entryDate")} />
              {errors.entryDate && (
                <p className="text-sm text-destructive">{errors.entryDate.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="heightCm">Height (cm)</Label>
              <Input id="heightCm" type="number" step="0.1" {...register("heightCm")} />
              {errors.heightCm && (
                <p className="text-sm text-destructive">{errors.heightCm.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="stage">Stage (optional — updates current status)</Label>
            <Controller
              control={control}
              name="stage"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="stage" className="w-full">
                    <SelectValue placeholder="No change" />
                  </SelectTrigger>
                  <SelectContent>
                    {starterStatusValues.map((s) => (
                      <SelectItem key={s} value={s}>
                        {starterStatusLabels[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={3} {...register("notes")} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              Add entry
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
