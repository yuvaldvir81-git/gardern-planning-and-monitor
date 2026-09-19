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
