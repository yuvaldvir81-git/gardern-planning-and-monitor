"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trayFormSchema, type TrayFormValues } from "@/lib/validations";
import { createTrayFromGrid, parseGridFile } from "../trays/actions";

type Step = "upload" | "choose-sheet" | "details";

export function GridImportWizard({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [isParsing, setIsParsing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [grid, setGrid] = useState<string[][]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TrayFormValues>({
    resolver: zodResolver(trayFormSchema),
    defaultValues: {
      name: "",
      datePlanted: new Date().toISOString().slice(0, 10),
      location: "",
      seedSource: "",
      notes: "",
    },
  });

  async function parseAndContinue(file: File, sheet?: string) {
    setIsParsing(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      if (sheet) formData.set("sheet", sheet);
      const result = await parseGridFile(formData);

      if (result.needsSheetSelection) {
        setPendingFile(file);
        setSheetNames(result.sheets);
        setStep("choose-sheet");
        return;
      }

      setFileName(file.name);
      setGrid(result.grid);
      setStep("details");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't read that file");
    } finally {
      setIsParsing(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    await parseAndContinue(file);
  }

  const filledCount = grid.reduce((sum, row) => sum + row.filter((c) => c).length, 0);

  async function onSubmit(values: TrayFormValues) {
    setIsCreating(true);
    try {
      const { trayId, imported } = await createTrayFromGrid(values, grid);
      toast.success(`Created tray with ${imported} starter${imported === 1 ? "" : "s"}`);
      router.push(`/starters/trays/${trayId}`);
    } catch {
      toast.error("Couldn't create the tray. Please try again.");
    } finally {
      setIsCreating(false);
    }
  }

  if (step === "upload") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Import a tray grid</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload the .xlsx or .csv sheet that lays out your tray — each cell should hold one
            seed name, matching the physical position in the tray. We&apos;ll stop at the first
            empty row or column.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-10 text-center">
            {isParsing ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <Upload className="h-6 w-6 text-muted-foreground" />
            )}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                disabled={isParsing}
                onChange={handleFileChange}
              />
              <Button
                type="button"
                variant="secondary"
                disabled={isParsing}
                onClick={() => fileInputRef.current?.click()}
              >
                Choose file
              </Button>
            </div>
          </div>
          <Button variant="ghost" onClick={onBack}>
            Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === "choose-sheet") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Choose a sheet — {pendingFile?.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This workbook has {sheetNames.length} sheets. Pick the one with your tray grid.
          </p>
          <div className="grid gap-2 sm:max-w-xs">
            {sheetNames.map((name) => (
              <Button
                key={name}
                type="button"
                variant="outline"
                className="justify-start"
                disabled={isParsing}
                onClick={() => pendingFile && parseAndContinue(pendingFile, name)}
              >
                {isParsing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {name}
              </Button>
            ))}
          </div>
          <Button
            variant="ghost"
            onClick={() => {
              setPendingFile(null);
              setStep("upload");
            }}
          >
            Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Name this tray — {fileName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">
            Detected a {grid.length} × {grid[0]?.length ?? 0} grid with {filledCount} filled
            cell{filledCount === 1 ? "" : "s"}.
          </p>
          <div
            className="mt-3 grid gap-1 overflow-auto rounded-lg border p-2"
            style={{ gridTemplateColumns: `repeat(${grid[0]?.length ?? 1}, minmax(2.5rem, 1fr))` }}
          >
            {grid.map((row, r) =>
              row.map((cell, c) => (
                <div
                  key={`${r}:${c}`}
                  className={
                    cell
                      ? "flex h-10 items-center justify-center overflow-hidden rounded bg-secondary px-1 text-center text-xs leading-tight"
                      : "h-10 rounded border border-dashed"
                  }
                  title={cell}
                >
                  <span className="line-clamp-2 break-words">{cell}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Tray name</Label>
            <Input id="name" placeholder="Tomato tray A" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
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
              <Label htmlFor="location">Location</Label>
              <Input id="location" placeholder="Windowsill" {...register("location")} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="seedSource">Seed source</Label>
            <Input id="seedSource" placeholder="Baker Creek" {...register("seedSource")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={3} {...register("notes")} />
          </div>
          <div className="flex justify-between pt-2">
            <Button type="button" variant="outline" onClick={() => setStep("upload")}>
              Back
            </Button>
            <Button type="submit" disabled={isCreating || filledCount === 0}>
              {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
              Create tray with {filledCount} starter{filledCount === 1 ? "" : "s"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
