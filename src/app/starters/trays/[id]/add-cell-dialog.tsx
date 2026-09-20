"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SeedNameCombobox } from "../../seed-name-combobox";
import { PhotoCaptureInput } from "../../photo-capture-input";
import { updateTrayCells } from "../actions";

export function AddCellDialog({
  trayId,
  position,
  seedNames,
  onOpenChange,
  onAdded,
}: {
  trayId: string;
  position: { rowIndex: number; colIndex: number } | null;
  seedNames: string[];
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
}) {
  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleAdd() {
    if (!position || !name.trim()) return;
    setIsSaving(true);
    try {
      await updateTrayCells(trayId, [
        { rowIndex: position.rowIndex, colIndex: position.colIndex, name, photoUrl },
      ]);
      toast.success("Starter added");
      setName("");
      setPhotoUrl(null);
      onAdded();
    } catch {
      toast.error("Couldn't add starter");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog
      open={position !== null}
      onOpenChange={(next) => {
        if (!next) {
          setName("");
          setPhotoUrl(null);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add a seed</DialogTitle>
          <DialogDescription>
            {position && `Row ${position.rowIndex + 1}, column ${position.colIndex + 1}`}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="cell-name">Seed name</Label>
          <SeedNameCombobox
            id="cell-name"
            value={name}
            onChange={setName}
            suggestions={seedNames}
            placeholder="Cherokee Purple"
          />
        </div>
        <div className="grid gap-2">
          <Label>Seed package photo</Label>
          <PhotoCaptureInput value={photoUrl} onChange={setPhotoUrl} />
        </div>
        <DialogFooter>
          <Button onClick={handleAdd} disabled={isSaving || !name.trim()}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
