import { z } from "zod";

export const starterStatusValues = [
  "seed",
  "germinating",
  "seedling",
  "transplanted",
  "growing",
  "harvested",
  "dead",
] as const;

export const starterStatusLabels: Record<(typeof starterStatusValues)[number], string> = {
  seed: "Seed",
  germinating: "Germinating",
  seedling: "Seedling",
  transplanted: "Transplanted",
  growing: "Growing",
  harvested: "Harvested",
  dead: "Dead",
};

export const starterFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  species: z.string().trim().max(120).optional().or(z.literal("")),
  variety: z.string().trim().max(120).optional().or(z.literal("")),
  seedSource: z.string().trim().max(120).optional().or(z.literal("")),
  datePlanted: z.string().min(1, "Date planted is required"),
  location: z.string().trim().max(160).optional().or(z.literal("")),
  status: z.enum(starterStatusValues),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type StarterFormValues = z.infer<typeof starterFormSchema>;

export const growthEntryFormSchema = z.object({
  entryDate: z.string().min(1, "Date is required"),
  heightCm: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || !Number.isNaN(Number(v)), "Height must be a number"),
  stage: z.enum(starterStatusValues).optional(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type GrowthEntryFormValues = z.infer<typeof growthEntryFormSchema>;

export const starterStatusColors: Record<(typeof starterStatusValues)[number], string> = {
  seed: "bg-muted text-muted-foreground",
  germinating: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  seedling: "bg-lime-500/15 text-lime-600 dark:text-lime-400",
  transplanted: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  growing: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  harvested: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  dead: "bg-destructive/15 text-destructive",
};

export const trayFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  datePlanted: z.string().min(1, "Date planted is required"),
  location: z.string().trim().max(160).optional().or(z.literal("")),
  seedSource: z.string().trim().max(120).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type TrayFormValues = z.infer<typeof trayFormSchema>;
