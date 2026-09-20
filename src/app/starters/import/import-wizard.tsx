"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  guessColumnMapping,
  importFieldDefs,
  normalizeImportRow,
  type ColumnMapping,
  type ImportFieldKey,
  type NormalizedImportRow,
} from "@/lib/import";
import { parseImportFile, importStarters } from "./actions";

const NO_COLUMN = "__none__";

type Step = "upload" | "choose-sheet" | "map" | "preview";

export function ImportWizard({ onBack }: { onBack: () => void }) {
  const t = useTranslations("importTable");
  const tStatus = useTranslations("status");
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);

  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [truncated, setTruncated] = useState(false);
  const [mapping, setMapping] = useState<ColumnMapping>({});

  const normalizedRows = useMemo<NormalizedImportRow[]>(
    () => rawRows.map((row, i) => normalizeImportRow(row, mapping, i)),
    [rawRows, mapping]
  );
  const validRows = normalizedRows.filter((r) => r.errors.length === 0);

  async function parseAndContinue(file: File, sheet?: string) {
    setIsParsing(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      if (sheet) formData.set("sheet", sheet);
      const result = await parseImportFile(formData);

      if (result.needsSheetSelection) {
        setPendingFile(file);
        setSheetNames(result.sheets);
        setStep("choose-sheet");
        return;
      }

      setFileName(file.name);
      setHeaders(result.headers);
      setRawRows(result.rows);
      setMapping(guessColumnMapping(result.headers));
      setTruncated(result.truncated);
      setStep("map");
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

  async function handleSheetChosen(sheet: string) {
    if (!pendingFile) return;
    await parseAndContinue(pendingFile, sheet);
  }

  async function handleImport() {
    setIsImporting(true);
    try {
      const { imported } = await importStarters(validRows.map((r) => r.values));
      toast.success(t("toastImported", { count: imported }));
      router.push("/starters");
    } catch {
      toast.error(t("toastImportFailed"));
    } finally {
      setIsImporting(false);
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
              <p className="mt-2 text-xs text-muted-foreground">{t("fileHint")}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("templateHint")}{" "}
            <a href="/starter-import-template.csv" download className="underline">
              {t("downloadTemplate")}
            </a>
            .
          </p>
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
            {t("chooseSheetTitle", { fileName: pendingFile?.name ?? "" })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("chooseSheetDescription", { count: sheetNames.length })}
          </p>
          <div className="grid gap-2 sm:max-w-xs">
            {sheetNames.map((name) => (
              <Button
                key={name}
                type="button"
                variant="outline"
                className="justify-start"
                disabled={isParsing}
                onClick={() => handleSheetChosen(name)}
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

  if (step === "map") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("mapTitle", { fileName })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("mapDescription", {
              count: rawRows.length,
              truncated: truncated ? "true" : "false",
            })}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {importFieldDefs.map((field) => (
              <div key={field.key} className="grid gap-2">
                <Label>
                  {t(`fields.${field.key}`)}
                  {field.required && <span className="text-destructive"> *</span>}
                </Label>
                <Select
                  value={
                    mapping[field.key] !== undefined ? String(mapping[field.key]) : NO_COLUMN
                  }
                  onValueChange={(value) =>
                    setMapping((prev) => {
                      const next = { ...prev };
                      if (value === NO_COLUMN) delete next[field.key as ImportFieldKey];
                      else next[field.key as ImportFieldKey] = Number(value);
                      return next;
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("notMapped")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_COLUMN}>{t("dontImport")}</SelectItem>
                    {headers.map((header, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {header || t("columnFallback", { index: i + 1 })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep("upload")}>
              {t("back")}
            </Button>
            <Button onClick={() => setStep("preview")}>{t("previewImport")}</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("reviewTitle", { fileName })}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t("reviewDescription", { valid: validRows.length, total: normalizedRows.length })}
        </p>
        <div className="max-h-96 overflow-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colRow")}</TableHead>
                <TableHead>{t("colName")}</TableHead>
                <TableHead>{t("colSpeciesVariety")}</TableHead>
                <TableHead>{t("colDatePlanted")}</TableHead>
                <TableHead>{t("colStatus")}</TableHead>
                <TableHead>{t("colResult")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {normalizedRows.map((row) => (
                <TableRow key={row.rowIndex}>
                  <TableCell className="text-muted-foreground">{row.rowIndex + 1}</TableCell>
                  <TableCell>{row.values.name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {[row.values.species, row.values.variety].filter(Boolean).join(" — ") || "—"}
                  </TableCell>
                  <TableCell>{row.values.datePlanted || "—"}</TableCell>
                  <TableCell>{tStatus(row.values.status)}</TableCell>
                  <TableCell>
                    {row.errors.length === 0 ? (
                      <Badge variant="secondary">{t("ready")}</Badge>
                    ) : (
                      <span className="text-sm text-destructive">{row.errors.join("; ")}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={() => setStep("map")} disabled={isImporting}>
            {t("backToMapping")}
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" render={<Link href="/starters" />}>
              {t("cancel")}
            </Button>
            <Button onClick={handleImport} disabled={validRows.length === 0 || isImporting}>
              {isImporting && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("importButton", { count: validRows.length })}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
