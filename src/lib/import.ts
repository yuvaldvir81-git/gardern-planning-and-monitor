import { starterStatusLabels, starterStatusValues } from "@/lib/validations";

export const importFieldDefs = [
  { key: "name", label: "Name", required: true },
  { key: "species", label: "Species", required: false },
  { key: "variety", label: "Variety", required: false },
  { key: "seedSource", label: "Seed source", required: false },
  { key: "datePlanted", label: "Date planted", required: true },
  { key: "location", label: "Location", required: false },
  { key: "status", label: "Status", required: false },
  { key: "notes", label: "Notes", required: false },
] as const;

export type ImportFieldKey = (typeof importFieldDefs)[number]["key"];
export type ColumnMapping = Partial<Record<ImportFieldKey, number>>;

const FIELD_SYNONYMS: Record<ImportFieldKey, string[]> = {
  name: ["name", "starter", "starter name", "label", "tray"],
  species: ["species", "plant", "crop"],
  variety: ["variety", "cultivar"],
  seedSource: ["seed source", "source", "supplier", "brand"],
  datePlanted: ["date planted", "planted", "plant date", "sowing date", "sown", "date sown"],
  location: ["location", "container", "tray location", "bed"],
  status: ["status", "stage"],
  notes: ["notes", "note", "comments", "comment"],
};

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function guessColumnMapping(headers: string[]): ColumnMapping {
  const normalized = headers.map(normalizeHeader);
  const mapping: ColumnMapping = {};
  for (const field of importFieldDefs) {
    const synonyms = FIELD_SYNONYMS[field.key].map(normalizeHeader);
    const idx = normalized.findIndex((h) => synonyms.includes(h));
    if (idx !== -1) mapping[field.key] = idx;
  }
  return mapping;
}

export function parseImportDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

export function matchStatus(value: string): (typeof starterStatusValues)[number] | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  return (
    starterStatusValues.find(
      (s) => s === normalized || starterStatusLabels[s].toLowerCase() === normalized
    ) ?? null
  );
}

export type NormalizedImportRow = {
  rowIndex: number;
  values: {
    name: string;
    species: string;
    variety: string;
    seedSource: string;
    datePlanted: string;
    location: string;
    status: (typeof starterStatusValues)[number];
    notes: string;
  };
  errors: string[];
};

export function normalizeImportRow(
  row: string[],
  mapping: ColumnMapping,
  rowIndex: number
): NormalizedImportRow {
  const get = (key: ImportFieldKey) => {
    const idx = mapping[key];
    return idx === undefined ? "" : (row[idx] ?? "").trim();
  };

  const errors: string[] = [];

  const name = get("name");
  if (!name) errors.push("Missing name");

  const rawDate = get("datePlanted");
  const datePlanted = rawDate ? parseImportDate(rawDate) : null;
  if (!datePlanted) errors.push(rawDate ? `Unrecognized date "${rawDate}"` : "Missing date planted");

  const rawStatus = get("status");
  const matchedStatus = rawStatus ? matchStatus(rawStatus) : "seed";
  if (rawStatus && !matchedStatus) errors.push(`Unrecognized status "${rawStatus}"`);

  return {
    rowIndex,
    values: {
      name,
      species: get("species"),
      variety: get("variety"),
      seedSource: get("seedSource"),
      datePlanted: datePlanted ?? "",
      location: get("location"),
      status: matchedStatus ?? "seed",
      notes: get("notes"),
    },
    errors,
  };
}
