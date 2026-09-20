"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createGarden, geocodeAddress, type GeocodeResult } from "../actions";

export function NewGardenForm() {
  const t = useTranslations("garden");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [selected, setSelected] = useState<GeocodeResult | null>(null);
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length < 3) return;
    setIsSearching(true);
    setSelected(null);
    try {
      const found = await geocodeAddress(query);
      setResults(found);
    } catch {
      toast.error(t("geocodeError"));
    } finally {
      setIsSearching(false);
    }
  }

  async function handleCreate() {
    if (!selected || !name.trim()) return;
    setIsCreating(true);
    try {
      const { gardenId } = await createGarden({
        name: name.trim(),
        addressLabel: selected.label,
        lat: selected.lat,
        lng: selected.lng,
      });
      toast.success(t("toastCreated"));
      router.push(`/garden/${gardenId}`);
    } catch {
      toast.error(t("toastCreateError"));
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("newTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSearch} className="grid gap-2">
          <Label htmlFor="address-search">{t("addressSearchLabel")}</Label>
          <div className="flex gap-2">
            <Input
              id="address-search"
              placeholder={t("addressSearchPlaceholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
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

        {isSearching && <p className="text-sm text-muted-foreground">{t("searching")}</p>}

        {!isSearching && results.length === 0 && query.trim().length >= 3 && (
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

        {selected && (
          <div className="grid gap-4 border-t pt-4">
            <div className="grid gap-2">
              <Label htmlFor="garden-name">{t("gardenName")}</Label>
              <Input
                id="garden-name"
                placeholder={t("gardenNamePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <Button onClick={handleCreate} disabled={isCreating || !name.trim()}>
              {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("createGarden")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
