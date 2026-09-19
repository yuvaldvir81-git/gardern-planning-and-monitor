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
  starterFormSchema,
  starterStatusLabels,
  starterStatusValues,
  type StarterFormValues,
} from "@/lib/validations";
import type { plantStarters } from "@/db/schema";

type Starter = typeof plantStarters.$inferSelect;

export function StarterFormDialog({
  starter,
  trigger,
  onSubmit,
}: {
  starter?: Starter;
  trigger: React.ReactElement;
  onSubmit: (values: StarterFormValues) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StarterFormValues>({
    resolver: zodResolver(starterFormSchema),
    defaultValues: starter
      ? {
          name: starter.name,
          species: starter.species ?? "",
          variety: starter.variety ?? "",
          seedSource: starter.seedSource ?? "",
          datePlanted: starter.datePlanted,
          location: starter.location ?? "",
          status: starter.status,
          notes: starter.notes ?? "",
        }
      : {
          name: "",
          species: "",
          variety: "",
          seedSource: "",
          datePlanted: new Date().toISOString().slice(0, 10),
          location: "",
          status: "seed",
          notes: "",
        },
  });

  async function submit(values: StarterFormValues) {
    try {
      await onSubmit(values);
      toast.success(starter ? "Starter updated" : "Starter added");
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
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{starter ? "Edit starter" : "Add a plant starter"}</DialogTitle>
          <DialogDescription>
            Track a seed or starter you&apos;re growing.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="Tomato tray A - cell 3" {...register("name")} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="species">Species</Label>
              <Input id="species" placeholder="Tomato" {...register("species")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="variety">Variety</Label>
              <Input id="variety" placeholder="Cherokee Purple" {...register("variety")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="datePlanted">Date planted</Label>
              <Input id="datePlanted" type="date" {...register("datePlanted")} />
              {errors.datePlanted && (
                <p className="text-sm text-destructive">{errors.datePlanted.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="status" className="w-full">
                      <SelectValue />
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="seedSource">Seed source</Label>
              <Input id="seedSource" placeholder="Baker Creek" {...register("seedSource")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" placeholder="Windowsill tray" {...register("location")} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={3} {...register("notes")} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {starter ? "Save changes" : "Add starter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
