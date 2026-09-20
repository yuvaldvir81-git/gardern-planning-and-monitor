"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Grid3x3, Table2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImportWizard } from "./import-wizard";
import { GridImportWizard } from "./grid-import-wizard";

type Mode = "grid" | "table" | null;

export function ImportFlow() {
  const t = useTranslations("importFlow");
  const [mode, setMode] = useState<Mode>(null);

  if (mode === "grid") return <GridImportWizard onBack={() => setMode(null)} />;
  if (mode === "table") return <ImportWizard onBack={() => setMode(null)} />;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <button type="button" className="text-start" onClick={() => setMode("grid")}>
        <Card className="h-full transition-colors hover:border-primary">
          <CardHeader>
            <Grid3x3 className="h-6 w-6 text-muted-foreground" />
            <CardTitle className="text-lg">{t("gridTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{t("gridDescription")}</p>
          </CardContent>
        </Card>
      </button>
      <button type="button" className="text-start" onClick={() => setMode("table")}>
        <Card className="h-full transition-colors hover:border-primary">
          <CardHeader>
            <Table2 className="h-6 w-6 text-muted-foreground" />
            <CardTitle className="text-lg">{t("tableTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{t("tableDescription")}</p>
          </CardContent>
        </Card>
      </button>
    </div>
  );
}
