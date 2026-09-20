"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { starterFormSchema, starterStatusValues, type StarterFormValues } from "@/lib/validations";
import { SeedNameCombobox } from "./seed-name-combobox";
import { PhotoCaptureInput } from "./photo-capture-input";
import { getSeedTypeNames } from "./seed-types/actions";
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
  const t = useTranslations("starterForm");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("status");
  const [open, setOpen] = useState(false);
  const [seedNames, setSeedNames] = useState<string[]>([]);

  useEffect(() => {
    if (open) getSeedTypeNames().then(setSeedNames);
  }, [open]);

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
          photoUrl: starter.photoUrl ?? "",
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
          photoUrl: "",
        },
  });

  async function submit(values: StarterFormValues) {
    try {
      await onSubmit(values);
      toast.success(starter ? t("toastUpdated") : t("toastAdded"));
      setOpen(false);
      reset();
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
          <DialogTitle>{starter ? t("editTitle") : t("addTitle")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">{t("name")}</Label>
            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <SeedNameCombobox
                  id="name"
                  placeholder={t("namePlaceholder")}
                  value={field.value}
                  onChange={field.onChange}
                  suggestions={seedNames}
                />
              )}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="species">{t("species")}</Label>
              <Input id="species" placeholder={t("speciesPlaceholder")} {...register("species")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="variety">{t("variety")}</Label>
              <Input id="variety" placeholder={t("varietyPlaceholder")} {...register("variety")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="datePlanted">{t("datePlanted")}</Label>
              <Input id="datePlanted" type="date" {...register("datePlanted")} />
              {errors.datePlanted && (
                <p className="text-sm text-destructive">{errors.datePlanted.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">{t("status")}</Label>
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
                          {tStatus(s)}
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
              <Label htmlFor="seedSource">{t("seedSource")}</Label>
              <Input id="seedSource" placeholder={t("seedSourcePlaceholder")} {...register("seedSource")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">{t("location")}</Label>
              <Input id="location" placeholder={t("locationPlaceholder")} {...register("location")} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">{t("notes")}</Label>
            <Textarea id="notes" rows={3} {...register("notes")} />
          </div>

          <div className="grid gap-2">
            <Label>{t("photo")}</Label>
            <Controller
              control={control}
              name="photoUrl"
              render={({ field }) => (
                <PhotoCaptureInput
                  value={field.value || null}
                  onChange={(url) => field.onChange(url ?? "")}
                />
              )}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {starter ? tCommon("saveChanges") : t("addButton")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
