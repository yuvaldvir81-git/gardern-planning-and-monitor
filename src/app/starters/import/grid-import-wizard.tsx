"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  trayBatchFormSchema,
  trayFormSchema,
  type TrayBatchFormValues,
  type TrayFormValues,
} from "@/lib/validations";
import {
  createTrayFromGrid,
  createTraysFromSheets,
  parseAllGridSheets,
  parseGridFile,
  type ParsedTraySheet,
} from "../trays/actions";

type Step = "upload" | "choose-sheet" | "details" | "batch-review";

export function GridImportWizard({ onBack }: { onBack: () => void }) {
  const t = useTranslations("importGrid");
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [isParsing, setIsParsing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [grid, setGrid] = useState<string[][]>([]);
  const [parsedSheets, setParsedSheets] = useState<ParsedTraySheet[]>([]);

  const singleForm = useForm<TrayFormValues>({
    resolver: zodResolver(trayFormSchema),
    defaultValues: {
      name: "",
      datePlanted: new Date().toISOString().slice(0, 10),
      location: "",
      seedSource: "",
      notes: "",
    },
  });

  const batchForm = useForm<TrayBatchFormValues>({
    resolver: zodResolver(trayBatchFormSchema),
    defaultValues: {
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
      toast.error(err instanceof Error ? err.message : t("toastReadError"));
    } finally {
      setIsParsing(false);
    }
  }

  async function handleImportAll() {
    if (!pendingFile) return;
    setIsParsing(true);
    try {
      const formData = new FormData();
      formData.set("file", pendingFile);
      const result = await parseAllGridSheets(formData);
      setParsedSheets(result.sheets);
      setStep("batch-review");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toastReadError"));
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
  const validSheets = parsedSheets.filter((s) => !s.error);
  const skippedSheets = parsedSheets.filter((s) => s.error);

  async function onSubmit(values: TrayFormValues) {
    setIsCreating(true);
    try {
      const { trayId, imported } = await createTrayFromGrid(values, grid);
      toast.success(t("toastCreated", { count: imported }));
      router.push(`/starters/trays/${trayId}`);
    } catch {
      toast.error(t("toastCreateError"));
    } finally {
      setIsCreating(false);
    }
  }

  async function onSubmitBatch(values: TrayBatchFormValues) {
    setIsCreating(true);
    try {
      const { trays } = await createTraysFromSheets(
        values,
        validSheets.map((s) => ({ name: s.name, grid: s.grid }))
      );
      toast.success(t("toastCreatedBatch", { count: trays.length }));
      router.push("/starters");
    } catch {
      toast.error(t("toastCreateBatchError"));
    } finally {
      setIsCreating(false);
    }
  }

  if (step === "upload") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("uploadTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("uploadDescription")}</p>
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
                {t("chooseFile")}
              </Button>
            </div>
          </div>
          <Button variant="ghost" onClick={onBack}>
            {t("back")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === "choose-sheet") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t("chooseSheetsTitle", { fileName: pendingFile?.name ?? "" })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("chooseSheetsDescription", { count: sheetNames.length })}
          </p>
          <Button type="button" disabled={isParsing} onClick={handleImportAll}>
            {isParsing && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("importAll", { count: sheetNames.length })}
          </Button>
          <p className="text-sm text-muted-foreground">{t("orPickOne")}</p>
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
            {t("back")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === "batch-review") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t("batchReviewTitle", { fileName: pendingFile?.name ?? "" })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {t("batchWillCreate", { count: validSheets.length })}
            </p>
            <ul className="grid gap-1 text-sm sm:grid-cols-2">
              {validSheets.map((s) => (
                <li key={s.name} className="rounded-md border px-3 py-2">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-muted-foreground">
                    {" — "}
                    {t("traySummary", {
                      rows: s.grid.length,
                      cols: s.grid[0]?.length ?? 0,
                      count: s.filledCount,
                    })}
                  </span>
                </li>
              ))}
            </ul>
            {skippedSheets.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {t("skipped", {
                  count: skippedSheets.length,
                  details: skippedSheets.map((s) => `${s.name} (${s.error})`).join(", "),
                })}
              </div>
            )}
          </div>

          <form onSubmit={batchForm.handleSubmit(onSubmitBatch)} className="grid gap-4">
            <p className="text-sm text-muted-foreground">{t("sharedDetailsHint")}</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="batch-datePlanted">{t("datePlanted")}</Label>
                <Input
                  id="batch-datePlanted"
                  type="date"
                  {...batchForm.register("datePlanted")}
                />
                {batchForm.formState.errors.datePlanted && (
                  <p className="text-sm text-destructive">
                    {batchForm.formState.errors.datePlanted.message}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="batch-location">{t("location")}</Label>
                <Input
                  id="batch-location"
                  placeholder={t("locationPlaceholder")}
                  {...batchForm.register("location")}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="batch-seedSource">{t("seedSource")}</Label>
              <Input
                id="batch-seedSource"
                placeholder={t("seedSourcePlaceholder")}
                {...batchForm.register("seedSource")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="batch-notes">{t("notes")}</Label>
              <Textarea id="batch-notes" rows={3} {...batchForm.register("notes")} />
            </div>
            <div className="flex justify-between pt-2">
              <Button type="button" variant="outline" onClick={() => setStep("choose-sheet")}>
                {t("back")}
              </Button>
              <Button type="submit" disabled={isCreating || validSheets.length === 0}>
                {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("createBatchButton", { count: validSheets.length })}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("detailsTitle", { fileName })}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">
            {t("detected", {
              rows: grid.length,
              cols: grid[0]?.length ?? 0,
              count: filledCount,
            })}
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

        <form onSubmit={singleForm.handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">{t("name")}</Label>
            <Input id="name" placeholder={t("namePlaceholder")} {...singleForm.register("name")} />
            {singleForm.formState.errors.name && (
              <p className="text-sm text-destructive">
                {singleForm.formState.errors.name.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="datePlanted">{t("datePlanted")}</Label>
              <Input id="datePlanted" type="date" {...singleForm.register("datePlanted")} />
              {singleForm.formState.errors.datePlanted && (
                <p className="text-sm text-destructive">
                  {singleForm.formState.errors.datePlanted.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">{t("location")}</Label>
              <Input
                id="location"
                placeholder={t("locationPlaceholder")}
                {...singleForm.register("location")}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="seedSource">{t("seedSource")}</Label>
            <Input
              id="seedSource"
              placeholder={t("seedSourcePlaceholder")}
              {...singleForm.register("seedSource")}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">{t("notes")}</Label>
            <Textarea id="notes" rows={3} {...singleForm.register("notes")} />
          </div>
          <div className="flex justify-between pt-2">
            <Button type="button" variant="outline" onClick={() => setStep("upload")}>
              {t("back")}
            </Button>
            <Button type="submit" disabled={isCreating || filledCount === 0}>
              {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("createButton", { count: filledCount })}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
