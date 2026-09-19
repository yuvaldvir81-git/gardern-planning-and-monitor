"use client";

import { useState } from "react";
import { Grid3x3, Table2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImportWizard } from "./import-wizard";
import { GridImportWizard } from "./grid-import-wizard";

type Mode = "grid" | "table" | null;

export function ImportFlow() {
  const [mode, setMode] = useState<Mode>(null);

  if (mode === "grid") return <GridImportWizard onBack={() => setMode(null)} />;
  if (mode === "table") return <ImportWizard onBack={() => setMode(null)} />;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <button type="button" className="text-left" onClick={() => setMode("grid")}>
        <Card className="h-full transition-colors hover:border-primary">
          <CardHeader>
            <Grid3x3 className="h-6 w-6 text-muted-foreground" />
            <CardTitle className="text-lg">Tray grid</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              My sheet is a grid — each cell holds one seed name at its physical position in
              the tray.
            </p>
          </CardContent>
        </Card>
      </button>
      <button type="button" className="text-left" onClick={() => setMode("table")}>
        <Card className="h-full transition-colors hover:border-primary">
          <CardHeader>
            <Table2 className="h-6 w-6 text-muted-foreground" />
            <CardTitle className="text-lg">Table with columns</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              My sheet has one row per starter, with columns like species, date planted, and
              status.
            </p>
          </CardContent>
        </Card>
      </button>
    </div>
  );
}
