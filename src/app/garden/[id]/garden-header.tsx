"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, MapPin, Pencil, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  renameGarden,
  geocodeAddress,
  updateGardenLocation,
  type GeocodeResult,
} from "../actions";
import type { gardens } from "@/db/schema";

type Garden = typeof gardens.$inferSelect;

export function GardenHeader({ garden }: { garden: Garden }) {
  const t = useTranslations("garden");
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [nameInput, setNameInput] = useState(garden.name);
  const [addressQuery, setAddressQuery] = useState(garden.addressLabel ?? "");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [selected, setSelected] = useState<GeocodeResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function openDialog() {
    setNameInput(garden.name);
    setAddressQuery(garden.addressLabel ?? "");
    setResults([]);
    setSelected(null);
    setIsOpen(true);
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (addressQuery.trim().length < 3) return;
    setIsSearching(true);
    setSelected(null);
    try {
      const found = await geocodeAddress(addressQuery);
      setResults(found);
    } catch {
      toast.error(t("geocodeError"));
    } finally {
      setIsSearching(false);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      if (nameInput.trim() && nameInput.trim() !== garden.name) {
        await renameGarden(garden.id, nameInput.trim());
      }
      if (selected) {
        await updateGardenLocation(garden.id, {
          addressLabel: selected.label,
          lat: selected.lat,
          lng: selected.lng,
        });
      }
      toast.success(t("toastAddressUpdated"));
      setIsOpen(false);
      router.refresh();
    } catch {
      toast.error(t("toastAddressUpdateError"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mb-4 flex items-start justify-between gap-2">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{garden.name}</h1>
        {garden.addressLabel && (
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>{garden.addressLabel}</span>
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t("editAddressAriaLabel")}
        onClick={openDialog}
      >
        <Pencil className="h-4 w-4" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("editAddressTitle")}</DialogTitle>
            <DialogDescription />
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="garden-name">{t("gardenName")}</Label>
              <Input
                id="garden-name"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
              />
            </div>
            <form onSubmit={handleSearch} className="grid gap-2">
              <Label htmlFor="address-search">{t("addressSearchLabel")}</Label>
              <div className="flex gap-2">
                <Input
                  id="address-search"
                  placeholder={t("addressSearchPlaceholder")}
                  value={addressQuery}
                  onChange={(e) => setAddressQuery(e.target.value)}
                />
                <Button type="submit" variant="secondary" disabled={isSearching}>
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </form>

            {!isSearching && results.length === 0 && addressQuery.trim().length >= 3 && (
              <p className="text-sm text-muted-foreground">{t("noResults")}</p>
            )}

            {results.length > 0 && (
              <ul className="grid gap-1.5">
                {results.map((r, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => setSelected(r)}
                      className={`flex w-full items-start gap-2 rounded-md border px-3 py-2 text-start text-sm hover:bg-muted ${
                        selected === r ? "border-primary bg-muted" : ""
                      }`}
                    >
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <span>{r.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>
              {t("cancel")}
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
